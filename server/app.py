from fastapi import FastAPI
from LBWDetection import LBWDetectionModel

app = FastAPI()

@app.get("/")
def hello():
    return {"message": "Hello World!"}

if __name__ == "__main__":
    model = LBWDetectionModel()
    print(model.get_result(input_video_path='video21.mp4', stump_img_path='frame6.jpg'))
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)