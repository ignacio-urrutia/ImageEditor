import React, { useState, useEffect, useRef } from 'react';
import { uploadImage, getImage, submitPoints, maskImageAsMain, editedImageAsMain, removeFromImage, editImage } from '../services/api';

function ImageEditor({ imageId, setImageId, getImageUrl }) {
    const [points, setPoints] = useState([]);
    const [secondaryImages, setSecondaryImages] = useState([]);
    const [secondaryImageType, setSecondaryImageType] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const [showAIPromptModal, setShowAIPromptModal] = useState(false);
    const [aiPrompt, setAIPrompt] = useState('');


    const canvasRef = useRef(null);
    const imageRef = useRef(null);

    const drawPoint = (x, y) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2, true);
        ctx.fill();
    };

    const clearPoints = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setPoints([]);
    };

    const handleCanvasClick = (event) => {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const canvasWidth = canvasRef.current.offsetWidth;
        const canvasHeight = canvasRef.current.offsetHeight;
        drawPoint(x, y);
        setPoints([...points, { x: x / canvasWidth, y: y / canvasHeight }]);
        console.log(points);
    };

    const repositionCanvas = () => {
        if (imageRef.current && canvasRef.current) {
            const image = imageRef.current;
            const canvas = canvasRef.current;
    
            // Use clientWidth and clientHeight for visible dimensions
            canvas.width = image.clientWidth;
            canvas.height = image.clientHeight;
    
            // Adjust canvas position
            // canvas.style.top = image.offsetTop + 'px';
            // canvas.style.left = image.offsetLeft + 'px';

            // Redraw all points according to new size
            points.forEach(point => {
                drawPoint(point.x * canvas.width, point.y * canvas.height);
            });
        }
    };

    const MakeSegmentation = async () => {
        var originalWidth = imageRef.current.naturalWidth;
        var originalHeight = imageRef.current.naturalHeight;
        const pointsAbsolutePosition = points.map(point => ({
            x: point.x * originalWidth,
            y: point.y * originalHeight
        }));
        setIsLoading(true);
        setLoadingMessage('Segmenting image...');
        const data = await submitPoints(imageId, pointsAbsolutePosition);
        setIsLoading(false);
        console.log(data);
        setSecondaryImages(data.segmented_images);
        setSecondaryImageType('segmented')
    }

    const chosenImageAsMain = async (imageId, maskImageId) => {
        const setAsMainFunction = secondaryImageType === 'segmented' ? maskImageAsMain : editedImageAsMain;

        setIsLoading(true);
        setLoadingMessage('Updating image...');
        const data = await setAsMainFunction(imageId, maskImageId);
        setIsLoading(false);
        console.log(data);
        setImageId(data.image_id);
        setSecondaryImages([]);
        setSecondaryImageType('');
        setPoints([]);
    }

    const RemovedImageAsMain = async (imageId, maskImageId) => {
        setIsLoading(true);
        setLoadingMessage('Updating image...');
        const data = await removeFromImage(imageId, maskImageId);
        setIsLoading(false);
        console.log(data);
        setImageId(data.image_id);
        setSecondaryImages([]);
        setSecondaryImageType('');
        setPoints([]);
    }

    const SendEditImage = async (imageId, prompt) => {
        setIsLoading(true);
        setLoadingMessage('Editing image...');
        const data = await editImage(imageId, prompt);
        setIsLoading(false);
        console.log(data);
        setSecondaryImages(data.edited_images);
        setSecondaryImageType('edited');
    }


    useEffect(() => {
        const handleResize = () => {
            repositionCanvas();
        };
    
        window.addEventListener('resize', handleResize);
    
        // Call once to set initial position and size
        repositionCanvas();
    
        return () => window.removeEventListener('resize', handleResize);
    }, [points]); // Depend on points to redraw them on resize
    

    useEffect(() => {
        // Initialize canvas and draw points when component mounts or points change
        repositionCanvas();
        points.forEach(point => drawPoint(point.x, point.y));
    }, [points]);

    return (
        <div>

            { !imageId &&
                <div>
                <h1>Upload an image</h1>
                <input type="file" onChange={async (e) => {
                    const image = e.target.files[0]
                    setIsLoading(true)
                    setLoadingMessage('Uploading image...')
                    const data = await uploadImage(image)
                    setIsLoading(false)
                    setImageId(data.image_id)
                }} />
                </div>
            }

            { imageId &&
                <div>
                    <h1>Image Editor</h1>
                    <div className='images-container'>
                        <div className="image-container" data-image-id={imageId}>
                            <img ref={imageRef} src={getImageUrl(imageId)} alt="Base" />
                            <canvas ref={canvasRef} onClick={handleCanvasClick}></canvas>
                        </div>
                        <div className="segmented-images-container">
                            {secondaryImages.map((url, index) => (
                                <div key={index} className='segmented-image-container'>
                                    <img src={url} alt={`Segmented ${index}`} />
                                    <button onClick={() => RemovedImageAsMain(imageId, index)}>Remove from Image</button>
                                    <button onClick={() => chosenImageAsMain(imageId, index)}>Set as Image</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Submit points */}
                    <button className="custom-button" onClick={MakeSegmentation}>
                        Submit Points
                    </button>
                    {/* Clear points */}
                    <button className="custom-button" onClick={clearPoints}>
                        Clear Points
                    </button>
                    {/* Download image */}
                    <a className="custom-button" href={getImageUrl(imageId)} download>
                        Download Image
                    </a>
                    {/* Edit image */}
                    <button className="custom-button" onClick={() => setShowAIPromptModal(true)}>
                        Fill with AI
                    </button>

                    {showAIPromptModal && (
                        <div className="modal">
                            <div className="modal-content">
                            <h2>AI-Powered Edit</h2>
                            <input
                                type="text"
                                placeholder="Enter your prompt here..."
                                value={aiPrompt}
                                onChange={(e) => setAIPrompt(e.target.value)}
                            />
                            <button
                                className="custom-button"
                                onClick={() => {
                                    setShowAIPromptModal(false);
                                    SendEditImage(imageId, aiPrompt);
                                }}
                            >
                                Submit Prompt
                            </button>
                            <button className="custom-button" onClick={() => setShowAIPromptModal(false)}>
                                Cancel
                            </button>
                            </div>
                        </div>
                        )}

                </div>
            }
            {isLoading && 
                <div className="modal">
                    <div className="modal-content">
                        <h1>Loading...</h1>
                        <h2>{loadingMessage}</h2>
                        <div className="loader"></div>
                    </div>
                </div>
            }
        </div>
    );
}

export default ImageEditor;
