from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
from io import BytesIO
import shutil
import tempfile
import cv2
import os
import logging

from LBWDetection import LBWDetectionModel

app = FastAPI()

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



# @app.post("/finalResult")
# async def final_result(video: UploadFile = File(...), stump_img: UploadFile = File(...)):
#     """Receive and store a video and a stump image."""
#     video_path = os.path.join(UPLOAD_DIR, video.filename)
#     stump_path = os.path.join(UPLOAD_DIR, stump_img.filename)

#     # Save video
#     with open(video_path, "wb") as buffer:
#         shutil.copyfileobj(video.file, buffer)

#     # Save stump image
#     with open(stump_path, "wb") as buffer:
#         shutil.copyfileobj(stump_img.file, buffer)

#     return JSONResponse(content={"message": "Files received successfully",
#                                  "video_path": video_path,
#                                  "stump_path": stump_path})



# @app.post("/finalResult")
# async def final_result(video: UploadFile = File(...), stump_img: UploadFile = File(...)):
#     """Endpoint to receive and send a video and a stump image."""
#     video_bytes = await video.read()
#     stump_bytes = await stump_img.read()
    
#     return JSONResponse(content={"message": "Files received successfully", "video_filename": video.filename, "stump_filename": stump_img.filename, "video_data": video_bytes.hex(), "stump_data": stump_bytes.hex()})


@app.post("/finalResult")
async def final_result(video: UploadFile = File(...), stump_img: UploadFile = File(...)):
    """Endpoint to process the uploaded video and stump image."""
    try:
        logger.info(f"Received files: Video={video.filename}, Stump Image={stump_img.filename}")

        # Validate file extensions
        if not video.filename.endswith(".mp4"):
            raise HTTPException(status_code=400, detail="Invalid video format. Only .mp4 allowed.")
        if not stump_img.filename.lower().endswith((".png", ".jpg", ".jpeg")):
            raise HTTPException(status_code=400, detail="Invalid image format. Only PNG/JPG/JPEG allowed.")

        # Create a temporary directory for caching
        cache_dir = tempfile.mkdtemp()
        video_path = os.path.join(cache_dir, video.filename)
        stump_image_path = os.path.join(cache_dir, stump_img.filename)

        # Save video
        video_bytes = await video.read()
        if not video_bytes:
            raise HTTPException(status_code=400, detail="Uploaded video is empty.")
        with open(video_path, "wb") as f:
            f.write(video_bytes)

        # Save stump image
        stump_bytes = await stump_img.read()
        if not stump_bytes:
            raise HTTPException(status_code=400, detail="Uploaded stump image is empty.")
        with open(stump_image_path, "wb") as f:
            f.write(stump_bytes)

        # Load image for OpenCV
        stump_image = cv2.imread(stump_image_path, cv2.IMREAD_COLOR)
        if stump_image is None:
            raise HTTPException(status_code=400, detail="Failed to decode stump image. Ensure it is a valid PNG/JPG file.")

        # Process video and image
        model = LBWDetectionModel()
        result = model.get_result(video_path, stump_image_path)
        print("result")
        print(result)
        print("result")
        # Cleanup: Remove temporary directory with all files
        shutil.rmtree(cache_dir)

        return JSONResponse(content=result)

    except HTTPException as e:
        logger.error(f"HTTP error: {e.detail}")
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})

    except Exception as e:
        logger.exception("Unexpected error occurred")


# @app.post("/finalResult")
# async def final_result(video: UploadFile = File(...), stump_img: UploadFile = File(...)):
#     print(f"Received video: {video.filename}, stump image: {stump_img.filename}")

#     # Save video
#     video_path = os.path.join(UPLOAD_DIR, video.filename)
#     with open(video_path, "wb") as buffer:
#         shutil.copyfileobj(video.file, buffer)

#     # Save stump image
#     stump_path = os.path.join(UPLOAD_DIR, stump_img.filename)
#     with open(stump_path, "wb") as buffer:
#         shutil.copyfileobj(stump_img.file, buffer)

#     model = LBWDetectionModel()

#     return model.get_result(video_path, stump_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
