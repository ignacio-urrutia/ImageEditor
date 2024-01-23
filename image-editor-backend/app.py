# app.py

from flask import Flask, render_template, request, send_from_directory, jsonify, url_for
from flask_cors import CORS
from PIL import Image
import os
import random
import cv2
import json
import time
import dotenv

dotenv.load_dotenv()
from openai import OpenAI
openai = OpenAI()

from image_segmenter import segment_image_from_points, get_or_initialize_predictor, substract_image, generate_prompted_edits

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins":["http://localhost:3000", "http://127.0.0.1:3000"]}}) # allow CORS for all domains on all routes, for image segmentation
app.config['CORS_HEADERS'] = 'Content-Type'

IMAGES_FOLDER = "images"

@app.route("/")
def index():
    return {"message": "Hello World"}

@app.route("/upload_image", methods=['POST'])
async def upload_image():
    if 'file' not in request.files:
        return 'Missing file '
    file = request.files['file']
    if file.filename == '':
        return 'No selected file'
    if file:
        # Generate a random image id
        image_id = random.randint(1, 100000)
        filename = file.filename
        os.mkdir(os.path.join(IMAGES_FOLDER, f"image_{image_id}"))
        image_path = os.path.join(IMAGES_FOLDER, f"image_{image_id}", filename)
        file.save(image_path)

        # Initialize the predictor
        image = cv2.imread(image_path)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        get_or_initialize_predictor(image_id, image_rgb)
        print(f"\nIMAGE PATH: {image_path}\n")
    
        return jsonify(image_id=image_id)
    
@app.route("/image/<image_id>")
def get_image(image_id):
    image_folder_path = os.path.join(IMAGES_FOLDER, f"image_{image_id}")
    # Search images inside the folder
    images = os.listdir(image_folder_path)
    # Get the first image not dir
    image = [file for file in images if os.path.isfile(os.path.join(image_folder_path, file))][0]
    # Send Content-disposition header to attachment
    return send_from_directory(image_folder_path, image, as_attachment=True)

@app.route("/image/<image_id>/masked_image/<mask_number>")
def get_masked_image(image_id, mask_number):
    image_folder_path = os.path.join(IMAGES_FOLDER, f"image_{image_id}", "segmentation")
    masked_image_filename = f"masked_image_{mask_number}.png"
    print(f"\nMASKED IMAGE PATH: {os.path.join(image_folder_path, masked_image_filename)}\n")

    return send_from_directory(image_folder_path, masked_image_filename)

@app.route("/image/<image_id>/edited_image/<edit_number>")
def get_edited_image(image_id, edit_number):
    image_folder_path = os.path.join(IMAGES_FOLDER, f"image_{image_id}", "edit")
    edited_image_filename = f"image_{edit_number}.png"
    print(f"\nEDITED IMAGE PATH: {os.path.join(image_folder_path, edited_image_filename)}\n")

    return send_from_directory(image_folder_path, edited_image_filename)

@app.route("/image/<image_id>/submit_points", methods=['POST'])
async def segment_image(image_id):
    data = json.loads(request.data)
    points = data.get('points')

    segmented_images = segment_image_from_points(image_id, points)
    # Construct URLs for the masked images
    masked_image_urls = [url_for('get_masked_image', image_id=image_id, mask_number=i) + f"?{time.time()}"
                         for i in range(len(segmented_images))]
    return jsonify(segmented_images=masked_image_urls)

@app.route("/image/<image_id>/set_mask_as_image/<mask_number>")
def set_mask_as_image(image_id, mask_number):
    # Create a new image with the masked image
    # Generate a random image id
    new_image_id = random.randint(1, 100000)
    os.mkdir(os.path.join(IMAGES_FOLDER, f"image_{new_image_id}"))
    masked_image_path = os.path.join(IMAGES_FOLDER, f"image_{image_id}", "segmentation", f"masked_image_{mask_number}.png")
    # Copy the masked image to the new image folder
    new_masked_image_path = os.path.join(IMAGES_FOLDER, f"image_{new_image_id}", "image.png")
    os.system(f"cp {masked_image_path} {new_masked_image_path}")
    # # Initialize the predictor
    # image = cv2.imread(new_masked_image_path)
    # image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    # get_or_initialize_predictor(new_image_id, image_rgb)
    # print(f"\nIMAGE PATH: {new_masked_image_path}\n")
    return jsonify(image_id=new_image_id)

@app.route("/image/<image_id>/set_edited_as_image/<edit_number>")
def set_edited_as_image(image_id, edit_number):
    # Create a new image with the masked image
    # Generate a random image id
    new_image_id = random.randint(1, 100000)
    os.mkdir(os.path.join(IMAGES_FOLDER, f"image_{new_image_id}"))
    edited_image_path = os.path.join(IMAGES_FOLDER, f"image_{image_id}", "edit", f"image_{edit_number}.png")
    # Copy the masked image to the new image folder
    new_edited_image_path = os.path.join(IMAGES_FOLDER, f"image_{new_image_id}", "image.png")
    os.system(f"cp {edited_image_path} {new_edited_image_path}")
    # # Initialize the predictor
    # image = cv2.imread(new_masked_image_path)
    # image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    # get_or_initialize_predictor(new_image_id, image_rgb)
    # print(f"\nIMAGE PATH: {new_masked_image_path}\n")
    return jsonify(image_id=new_image_id)

@app.route("/image/<image_id>/remove_from_image/<mask_number>")
def remove_from_image(image_id, mask_number):
    new_image_id = random.randint(1, 100000)
    os.mkdir(os.path.join(IMAGES_FOLDER, f"image_{new_image_id}"))
    image_path = os.path.join(IMAGES_FOLDER, f"image_{new_image_id}", "image.png")
    masked_image = substract_image(image_id, mask_number)
    masked_image.save(image_path)

    return jsonify(image_id=new_image_id)

@app.route("/image/<image_id>/edit_image", methods=['POST'])
async def edit_image(image_id):
    print(f"\n\nEDIT IMAGE\n\n")
    data = json.loads(request.data)
    print(f"\n\nDATA: {data}\n\n")
    prompt = data.get('prompt')

    edited_images = generate_prompted_edits(image_id, prompt)
    # Construct URLs for the masked images
    edited_image_urls = [url_for('get_edited_image', image_id=image_id, edit_number=i) + f"?{time.time()}"
                         for i in range(len(edited_images))]
    return jsonify(edited_images=edited_image_urls)
                         

if __name__ == '__main__':
    app.run(debug=True, port=5001)

    