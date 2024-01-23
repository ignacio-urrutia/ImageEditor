# image_segmenter.py

import cv2
from PIL import Image, ImageOps, ImageFilter
from segment_anything import SamAutomaticMaskGenerator, sam_model_registry, SamPredictor
import os
import numpy as np
import random
import requests
import dotenv
from io import BytesIO

dotenv.load_dotenv()
from openai import OpenAI
openai = OpenAI()

CHECKPOINT_PATH = "model/sam_vit_h_4b8939.pth"

IMAGES_FOLDER = "images"

IMAGE_PATH = os.path.join(IMAGES_FOLDER, "image_1", "image.png")
OUTPUT_PATH = os.path.join(IMAGES_FOLDER, "image_1", "segmentation") 

predictors = {}

def erode(cycles, image):
    for _ in range(cycles):
        image = image.filter(ImageFilter.MinFilter(3))
    return image

def dilate(cycles, image):
    for _ in range(cycles):
        image = image.filter(ImageFilter.MaxFilter(3))
    return image

def get_or_initialize_predictor(image_id, image_rgb):
    if str(image_id) not in predictors:
        print("Initializing predictor for id", image_id)
        # Load Model
        sam = sam_model_registry["vit_h"](checkpoint=CHECKPOINT_PATH)
        predictor = SamPredictor(sam)
        predictor.set_image(image_rgb)
        predictors[str(image_id)] = predictor
        print("Predictor initialized for id", image_id)
        print("Predictors keys:", predictors.keys())
    else:
        print("Predictor already initialized")
    return predictors[str(image_id)]

def segment_image_from_points(image_id, points):
    """
    Segments an image based on given points and saves the segmented and masked images.

    Args:
        image_id (int): The identifier for the image.
        points (list): A list of points for segmentation.

    Returns:
        list: Paths of the segmented images.
    """
    image_folder_path = create_image_folder_path(image_id)
    labels = np.array([1] * len(points))
    points_array = convert_points_to_array(points)

    create_segmentation_folder(image_folder_path)
    image_path = get_first_image_path(image_folder_path)

    image_rgb = read_image_as_rgb(image_path)
    predictor = get_or_initialize_predictor(image_id, image_rgb)
    masks, _, _ = predictor.predict(point_coords=points_array, point_labels=labels, multimask_output=True)

    # Dilate the masks
    masks = [dilate(5, Image.fromarray(mask)) for mask in masks]
    # Convert the masks to numpy arrays
    masks = [np.array(mask) for mask in masks]

    segmented_images_paths = save_segmented_images(image_path, masks, image_id)

    return segmented_images_paths


def create_image_folder_path(image_id):
    return os.path.join(IMAGES_FOLDER, f"image_{image_id}")

def convert_points_to_array(points):
    return np.array([(point["x"], point["y"]) for point in points])

def create_segmentation_folder(image_folder_path):
    segmentation_path = os.path.join(image_folder_path, "segmentation")
    if not os.path.exists(segmentation_path):
        os.mkdir(segmentation_path)

def get_first_image_path(image_folder_path):
    images = [file for file in os.listdir(image_folder_path) if os.path.isfile(os.path.join(image_folder_path, file))]
    return os.path.join(image_folder_path, images[0]) if images else None

def read_image_as_rgb(image_path):
    image = cv2.imread(image_path)
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

def save_segmented_images(image_path, masks, image_id):
    segmented_images = []
    for i, mask in enumerate(masks):
        mask_path, masked_image_path = save_mask_and_masked_image(image_path, mask, image_id, i)
        segmented_images.append(masked_image_path)
    return segmented_images

def save_mask_and_masked_image(image_path, mask, image_id, mask_number):
    output_path = create_image_folder_path(image_id)
    segmentation_folder = os.path.join(output_path, "segmentation")

    mask_image_path = os.path.join(segmentation_folder, f"mask_{mask_number}.png")
    masked_image_path = os.path.join(segmentation_folder, f"masked_image_{mask_number}.png")

    mask_image = Image.fromarray(mask)
    mask_image.save(mask_image_path)

    original_image = Image.open(image_path)
    blank_image = Image.new('RGBA', original_image.size, (255,0,0,0))
    masked_image = Image.composite(original_image, blank_image, mask_image)
    masked_image.save(masked_image_path)

    return mask_image_path, masked_image_path

def substract_image(image_id, mask_number):
    image_folder_path = os.path.join(IMAGES_FOLDER, f"image_{image_id}")
    image_filename = [file for file in os.listdir(image_folder_path) if os.path.isfile(os.path.join(image_folder_path, file))][0]
    image_path = os.path.join(image_folder_path, image_filename)
    mask_path = os.path.join(image_folder_path, "segmentation", f"mask_{mask_number}.png")
    image = Image.open(image_path)
    mask = Image.open(mask_path)
    inverted_mask = ImageOps.invert(mask)
    blank = Image.new('RGBA', image.size, (255,0,0,0))
    masked_image = Image.composite(image, blank, inverted_mask)

    return masked_image

def generate_prompted_edits(image_id, prompt):
    """
    Edits an image based on a given prompt and saves the edited images.

    Args:
        image_id (int): The identifier for the image.
        prompt (str): The prompt to use for editing the image.

    Returns:
        list: Paths of the edited images.
    """
    image_folder_path = create_image_folder_path(image_id)
    image_path = get_first_image_path(image_folder_path)
    if not image_path:
        return []  # Or handle the error as you prefer

    image_urls = generate_edited_images(image_path, prompt)
    return save_edited_images(image_urls, image_folder_path)

def generate_edited_images(image_path, prompt):
    with open(image_path, "rb") as image_file:
        response = openai.images.edit(
            model="dall-e-2",
            image=image_file,
            mask=image_file,  # Assuming you want to use the same image as mask
            prompt=prompt,
            n=3,
            size="1024x1024"
        )
    return [response.data[i].url for i in range(len(response.data))]

def save_edited_images(image_urls, folder_path):
    edit_folder_path = create_edit_folder(folder_path)
    image_paths = []
    for i, image_url in enumerate(image_urls):
        image_path = os.path.join(edit_folder_path, f"image_{i}.png")
        download_and_save_image(image_url, image_path)
        image_paths.append(image_path)
    return image_paths

def create_edit_folder(image_folder_path):
    edit_folder_path = os.path.join(image_folder_path, "edit")
    if not os.path.exists(edit_folder_path):
        os.makedirs(edit_folder_path)
    return edit_folder_path

def download_and_save_image(url, path):
    response = requests.get(url)
    with open(path, 'wb') as file:
        file.write(response.content)

# The functions create_image_folder_path and get_first_image_path are the same as in the previous refactoring


if __name__ == "__main__":
    pass
