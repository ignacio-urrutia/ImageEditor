"use client";
import Image from 'next/image'
import styles from './page.module.css'
import { useEffect, useState } from 'react';
import { uploadImage, getImage } from '../services/api';
const API_URL = process.env.NEXT_PUBLIC_API_URL 

export default function Home() {
  const [imageId, setImageId] = useState(null);

  const submitImage = async (e) => {
    console.log("e", e);
    e.preventDefault();
    const image = e.target.image.files[0];
    const data = await uploadImage(image);
    setImageId(data.image_id);
  }

  const [mainImage, setMainImage] = useState(null);
  const [overlayCanvas, setOverlayCanvas] = useState(null);
  const [pointsRelativePosition, setPointsRelativePosition] = useState([]);

  useEffect(() => {
    if (imageId) {
      const image = <Image src={`${API_URL}/image/${imageId}`} alt="Image" width={500} height={500} />
      const canvas = <canvas className={styles.overlay_canvas}></canvas>
      setMainImage(image);
      setOverlayCanvas(canvas);
    }
  }, [imageId]);

  function repositionCanvas(){
    //make canvas same as image, which may have changed size and position
    overlayCanvas.height = mainImage.height;
    overlayCanvas.width = mainImage.width;
    overlayCanvas.style.top = mainImage.offsetTop + "px";;
    overlayCanvas.style.left = mainImage.offsetLeft + "px";
    // drawAllPoints();
  }

  function initCanvas(){
    overlayCanvas.height = mainImage.height;
    overlayCanvas.width = mainImage.width;
    overlayCanvas.style.top = mainImage.offsetTop + "px";;
    overlayCanvas.style.left = mainImage.offsetLeft + "px";
  }

  function init(){
    initCanvas();
  }
    

  // Event listeners
  window.addEventListener('load',init)
  window.addEventListener('resize',repositionCanvas)


  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <div>

          <h1 className={styles.title}>
            Image Editor
          </h1>

          {!imageId &&
            <form onSubmit={submitImage}>
              <input type="file" name="image" />
              <input type="submit" value="Upload" />
            </form>
          }

          {imageId && 
            <div className={styles.images_container}>
                <div className={styles.image_container} data-image-id="{{ image_id }}">
                    {mainImage}
                    {overlayCanvas}
                </div>
                <div id="segmented-images-container">
                </div>
            </div>
          }

        </div>
      </div>
    </main>
  )
}
