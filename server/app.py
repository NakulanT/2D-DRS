from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse,FileResponse
from PIL import Image
import numpy as np
from io import BytesIO
import shutil
import tempfile
import cv2
import os
import logging
from fastapi.middleware.cors import CORSMiddleware


from LBWDetection import LBWDetectionModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to ["http://localhost:8081"] for better security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directory to save uploaded files
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def hello():
    return {"message": "Hello World!"}


@app.post("/check_stumps")
async def check_stumps(file: UploadFile = File(...)):
    """Endpoint to check if stumps are detected in the uploaded image."""
    image_bytes = await file.read()
    image = Image.open(BytesIO(image_bytes))

    model = LBWDetectionModel()
    result = model.check_stumps(image)

    if result:
        # Save the uploaded image
        image_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(image_path, "wb") as buffer:
            buffer.write(image_bytes)
        
        return JSONResponse(content={"result": True, "image_path": image_path}, media_type="application/json")

    return JSONResponse(content={"result": False}, media_type="application/json")


@app.post("/test")
async def receive_files(
    video: UploadFile = File(...),
    stump_img: UploadFile = File(...)
):
    print(f"Received video: {video.filename}, type: {video.content_type}")
    print(f"Received image: {stump_img.filename}, type: {stump_img.content_type}")
    return {"message": "Files received successfully"}

@app.post("/finalResult")
async def final_result(video: UploadFile = File(...), stump_img: UploadFile = File(...)):
    """Endpoint to process the uploaded video and stump image."""
    cache_dir = tempfile.mkdtemp()
    try:
        logger.info(f"Received files: Video={video.filename}, Stump Image={stump_img.filename}")

        # Validate file extensions
        if not video.filename.endswith(".mp4"):
            raise HTTPException(status_code=400, detail="Invalid video format. Only .mp4 allowed.")
        if not stump_img.filename.lower().endswith((".png", ".jpg", ".jpeg")):
            raise HTTPException(status_code=400, detail="Invalid image format. Only PNG/JPG/JPEG allowed.")

        # Define file paths
        video_path = os.path.join(cache_dir, video.filename)
        stump_image_path = os.path.join(cache_dir, stump_img.filename)

        # Save video (streaming to prevent memory issues)
        with open(video_path, "wb") as f:
            shutil.copyfileobj(video.file, f)

        # Save stump image (streaming to prevent memory issues)
        with open(stump_image_path, "wb") as f:
            shutil.copyfileobj(stump_img.file, f)

        logger.info("Files saved successfully. Processing...")

        # Load stump image for OpenCV
        stump_image = cv2.imread(stump_image_path, cv2.IMREAD_COLOR)
        if stump_image is None:
            raise HTTPException(status_code=400, detail="Failed to decode stump image. Ensure it is a valid PNG/JPG file.")

        # Process video and image
        model = LBWDetectionModel()
        result = model.get_result(video_path, stump_image_path)
        
        logger.info(f"Processing complete. Result: {result}")

        # return JSONResponse(content=result)
        return FileResponse(result, media_type="image/jpeg", filename="output_image.jpg")

    except HTTPException as e:
        logger.error(f"HTTP error: {e.detail}")
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})

    except Exception as e:
        logger.exception("Unexpected error occurred")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})

    finally:
        # Ensure cleanup happens even on failure
        shutil.rmtree(cache_dir, ignore_errors=True)
        logger.info("Temporary files cleaned up.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
