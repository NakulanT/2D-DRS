from flask import Flask
app = Flask(__name__)
from LBWDetection import LBWDetectionModel

@app.route("/")
def hello():
    return "Hello World!"

if __name__ == "__main__":
    model = LBWDetectionModel()
    print(model.get_result(input_video_path = 'video21.mp4',stump_img_path = 'frame6.jpg'))
    
    app.run()