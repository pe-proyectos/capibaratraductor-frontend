import { useEffect, useRef, useState } from "react";

export function ImageCanvas({ image, handleZoneSelected, zoomScale }) {
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const [selection, setSelection] = useState(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [start, setStart] = useState(null);
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!image?.file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                imageRef.current = img;
                drawImage();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(image.file);
    }, [image, canvasOffset]);

    useEffect(() => {
        if (!image?.file) return;
        setCanvasOffset(prev => {
            return {
                x: prev.x,
                y: 0
            };
        });
        drawImage();
    }, [zoomScale]);

    useEffect(() => {
        if (!image?.file) return;
        setSelection(null);
        setStart(null);
        setIsSelecting(false);
        setCanvasOffset({ x: 0, y: 0 });
        drawImage();
    }, [image]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const handleContextMenu = (e) => e.preventDefault();
        canvas.addEventListener('contextmenu', handleContextMenu);
        return () => {
            canvas.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            drawImage();
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        drawImage();
    }, [selection]);

    const drawImage = () => {
        const canvas = canvasRef.current;
        /** @type {CanvasRenderingContext2D} */
        const context = canvas.getContext('2d');
        const img = imageRef.current;
        if (!img) return; // Make sure img is loaded before drawing

        // Set canvas width and height to the width and height of the parent element
        const parentElement = canvas.parentElement;
        canvas.width = parentElement.clientWidth;
        canvas.height = parentElement.clientHeight;

        context.setTransform(1, 0, 0, 1, 0, canvasOffset.y);
        context.clearRect(0, 0, canvas.width, canvas.height);
        const scale = canvas.width / img.width;
        const imageHeight = img.height * scale;
        const heightOffset = imageHeight * zoomScale > canvas.height ? 0 : (canvas.height / 2) - (imageHeight * zoomScale / 2);
        const widthOffset = img.width * scale * zoomScale > canvas.width ? 0 : (canvas.width / 2) - (img.width * scale * zoomScale / 2);
        context.drawImage(img, widthOffset, heightOffset, img.width * scale * zoomScale, imageHeight * zoomScale);
        if (selection) {
            const { start, end } = selection;
            context.strokeStyle = 'red';
            context.lineWidth = 2;
            context.strokeRect(
                start.x,
                start.y,
                end.x - start.x,
                end.y - start.y
            );
        }
    };

    const handleMouseDown = (e) => {
        if (e.button === 0) {
            setIsSelecting(true);
            const rect = canvasRef.current.getBoundingClientRect();
            setStart({
                x: (e.clientX - rect.left),
                y: (e.clientY - rect.top + Math.abs(canvasOffset.y))
            });
            setSelection(null);
        }
    };

    const handleMouseMove = (e) => {
        if (isSelecting) {
            const rect = canvasRef.current.getBoundingClientRect();
            const current = {
                x: (e.clientX - rect.left),
                y: (e.clientY - rect.top + Math.abs(canvasOffset.y))
            };
            setSelection({ start, end: current });
            drawImage();
        }
    };

    const handleMouseUp = (e) => {
        if (isSelecting) {
            setIsSelecting(false);
            if (selection) {
                const { start, end } = selection;
                const width = end.x - start.x;
                const height = end.y - start.y;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                const imageData = context.getImageData(
                    start.x,
                    start.y - Math.abs(canvasOffset.y),
                    width,
                    height
                );
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
                const base64String = tempCanvas.toDataURL();
                handleZoneSelected(base64String);
                setSelection(null);
                drawImage();
            }
        }
    };

    const handleWheel = (e) => {
        if (isSelecting) {
            return;
        }

        const offsetY = e.deltaY;

        setCanvasOffset(prev => {
            const scale = canvasRef.current.width / imageRef.current.width;
            const imageHeight = imageRef.current.height * scale * zoomScale;
            const heightOffset = imageHeight > canvasRef.current.height ? 0 : (canvasRef.current.height / 2) - (imageHeight / 2);
            const maxOffset = Math.max(imageHeight - canvasRef.current.height, 0);

            if (imageHeight <= canvasRef.current.height) {
                return {
                    x: prev.x,
                    y: 0
                };
            }

            const newOffsetY = Math.max(Math.min(prev.y - offsetY + heightOffset, heightOffset), -maxOffset + heightOffset);

            return {
                ...prev,
                y: newOffsetY,
            };
        });
        drawImage();
    };

    // Set canvas dimensions dynamically or fixed size
    const canvasStyle = {
        width: '100%',
        height: '100%',
    };

    return (
        <canvas
            ref={canvasRef}
            style={canvasStyle}
            className="bg-black bg-opacity-60 shadow-lg m-auto cursor-crosshair rounded-md"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        />
    );
}
