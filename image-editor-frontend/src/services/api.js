    // src/services/api.js
    const API_URL = process.env.NEXT_PUBLIC_API_URL 

    export async function uploadImage(image) {
        const formData = new FormData()
        formData.append('file', image)
        const res = await fetch(`${API_URL}/upload_image`, {
            method: 'POST',
            body: formData
        })
        const data = await res.json()
        return data
        }

    export async function getImage(imageId) {
        const res = await fetch(`${API_URL}/image/${imageId}`)
        const data = await res.json()
        return data
    }

    export async function submitPoints(imageId, points) {
        const res = await fetch(`${API_URL}/image/${imageId}/submit_points`, {
            method: 'POST',
            body: JSON.stringify({ points }),
        })
        const data = await res.json()
        data.segmented_images = data.segmented_images.map(imageURL => `${API_URL}/${imageURL}`)
        return data
    }

    export async function maskImageAsMain(imageId, maskImageId) {
        const res = await fetch(`${API_URL}/image/${imageId}/set_mask_as_image/${maskImageId}`, {
            method: 'GET',
        })
        const data = await res.json()
        return data
    }

    export async function editedImageAsMain(imageId, editedImageId) {
        const res = await fetch(`${API_URL}/image/${imageId}/set_edited_as_image/${editedImageId}`, {
            method: 'GET',
        })
        const data = await res.json()
        return data
    }


    export async function removeFromImage(imageId, maskImageId) {
        const res = await fetch(`${API_URL}/image/${imageId}/remove_from_image/${maskImageId}`, {
            method: 'GET',
        })
        const data = await res.json()
        return data
    }

    export async function editImage(imageId, prompt) {
        const res = await fetch(`${API_URL}/image/${imageId}/edit_image`, {
            method: 'POST',
            body: JSON.stringify({ prompt }),
        })
        const data = await res.json()
        data.edited_images = data.edited_images.map(imageURL => `${API_URL}/${imageURL}`)
        return data
    }