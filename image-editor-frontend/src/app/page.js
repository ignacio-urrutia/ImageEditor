"use client";
import Image from 'next/image'
import styles from './page.module.css'
import { useEffect, useState } from 'react';
import { uploadImage, getImage } from '../services/api';
import { useRouter } from 'next/router'
import ImageEditor from '@/components/ImageEditor';

const API_URL = process.env.NEXT_PUBLIC_API_URL 

export default function Home() {
  const [imageId, setImageId] = useState(null)

  return (
    <main>
      <div>
        
          <ImageEditor 
            imageId={imageId}
            setImageId={setImageId}
            getImageUrl={(imageId) => `${API_URL}/image/${imageId}`}  
          />  

      </div>
    </main>
  )
}
