from fastapi import FastAPI
from LBWDetection import LBWDetectionModel

app = FastAPI()

@app.get("/")
def hello():
    return {"message": "Hello World!"}

@app.get("/detect/")
def detect(input_video: str, stump_img: str):
    model = LBWDetectionModel(frame=stump_img, vid=input_video)  # Initialize dynamically
    result = model.get_result()
    return {"result": result}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
