from fastapi import FastAPI
from LBWDetection import LBWDetectionModel

app = FastAPI()

@app.get("/")
def hello():
    return {"message": "Hello World!"}

@app.get("/results")
def predict(input_video_path: str, stump_img_path: str):
    model = LBWDetectionModel()
    return model.get_result(input_video_path, stump_img_path)

#this is used for cheack stumps in the inout image
@app.get("/check_stumps")
def check_stumps(input_image_path: str):
    model = LBWDetectionModel()
    if model.check_stumps(input_image_path):
        return {"message": "Stumps are present in the image"}
    else:    
        return {"message": "Stumps are not present in the image"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)