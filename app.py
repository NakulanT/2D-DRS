import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import os
import torch
import cv2
import numpy as np
import tempfile
from ultralytics import YOLO
from kalmanfilter import KalmanFilter
import shutil

# Set device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Load models
ball_detection_model = YOLO('new.pt').to(device)
stump_detection_model = YOLO('stump_detection.pt').to(device)
stump_img_path = 'frame6.jpg'
input_video_path = 'video19.mp4'
output_video_path = 'output_video.mp4'

COORDINATES = {} # format {'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0}
DETECTED_BOXES = []
CROPS = []
TEMP_DIR = None
BELOW_STUMP = False
PITCH_BOUNCE = False

def detect_and_crop(image, class_name='stumps'):
    global CROPS, TEMP_DIR
    if CROPS == [] or TEMP_DIR is None:
        results = stump_detection_model(image)[0]
        results = stump_detection_model(image)[0]  # Run inference
        TEMP_DIR = tempfile.mkdtemp()  # Temporary directory for cropped images
        
        for i, box in enumerate(results.boxes.xyxy):
            cls = int(results.boxes.cls[i])
            class_label = results.names[cls]
            
            if class_label == class_name:
                x1, y1, x2, y2 = map(int, box)
                cropped_img = image[y1:y2, x1:x2]
                crop_path = os.path.join(TEMP_DIR, f'crop_{i}.png')
                cv2.imwrite(crop_path, cropped_img)
                CROPS.append((crop_path, (x1, y1, x2, y2)))
        return CROPS, TEMP_DIR
    else:
        return CROPS, TEMP_DIR

def overlay_image(background, foreground, coords, alpha=0.8):
    x1, y1, x2, y2 = coords
    resized_fg = cv2.resize(foreground, (x2 - x1, y2 - y1))
    roi = background[y1:y2, x1:x2]
    blended = cv2.addWeighted(roi, 1 - alpha, resized_fg, alpha, 0)
    background[y1:y2, x1:x2] = blended

def detect_and_draw_boxes_with_overlay(image, stump_img, class_name='stumps'):
    global DETECTED_BOXES
    annotated_image = image.copy()
    
    if not DETECTED_BOXES:
        results = stump_detection_model(stump_img)[0]
        print("results",results.boxes)
        for i, box in enumerate(results.boxes.xyxy):
            cls = int(results.boxes.cls[i])
            class_label = results.names[cls]
            
            if class_label == class_name:
                x1, y1, x2, y2 = map(int, box)
                DETECTED_BOXES.append((x1, y1, x2, y2))

    if len(DETECTED_BOXES) == 2:
        (x1a, y1a, x2a, y2a), (x1b, y1b, x2b, y2b) = DETECTED_BOXES
        pts = np.array([[x2b, y2b], [x2a, y2a], [x1a, y2a], [x1b, y2b]], np.int32).reshape((-1, 1, 2))
        overlay = np.zeros_like(annotated_image)
        cv2.fillPoly(overlay, [pts], (255, 0, 0))
        cv2.addWeighted(overlay, 0.35, annotated_image, 0.65, 0, annotated_image)
        cv2.line(annotated_image, (x1a, y2a), (x1b, y2b), (255, 0, 0), 2)
        cv2.line(annotated_image, (x2a, y2a), (x2b, y2b), (255, 0, 0), 2)
        
    return annotated_image

def process_video(input_video_path, output_video_path, stump_img_path):
    global COORDINATES , BELOW_STUMP ,PITCH_BOUNCE
    kf = KalmanFilter()
    cap = cv2.VideoCapture(input_video_path)

    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (frame_width, frame_height))
    object_positions = []
    previous_positions = []
    frame_number = 0
    last_predicted = None

    stump_img = cv2.imread(stump_img_path)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_number += 1
        current_positions = []
        results = ball_detection_model(frame)
        frame = detect_and_draw_boxes_with_overlay(frame, stump_img=stump_img, class_name='stumps')
        
        cropped_images, temp_dir = detect_and_crop(stump_img, class_name='stumps')
        for crop_path, coords in cropped_images:
            cropped_img = cv2.imread(crop_path)
            overlay_image(frame, cropped_img, coords)

        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                COORDINATES['x1'] = x1
                COORDINATES['y1'] = y1
                COORDINATES['x2'] = x2
                COORDINATES['y2'] = y2
                center_x = (x1 + x2) // 2
                center_y = (y1 + y2) // 2 
                current_positions.append((center_x, center_y))
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        if current_positions:
            object_positions.append(current_positions)
            
        for frame_positions in object_positions:
            for center_x, center_y in frame_positions:
                cv2.circle(frame, (center_x, center_y), 7, (0, 0, 255), -1) 
        
        if not BELOW_STUMP and current_positions and (current_positions[0][1] > DETECTED_BOXES[0][1]  or current_positions[0][1] > DETECTED_BOXES[1][1]):
            print("Ball below stump height !!")
            BELOW_STUMP = True
        
        if BELOW_STUMP and not PITCH_BOUNCE and previous_positions and current_positions:
            if current_positions[0][1] < previous_positions[0][1]:
                print("Pitch bounce detected !!")
                PITCH_BOUNCE = True
            pass
            
        if BELOW_STUMP and PITCH_BOUNCE:
            for i, (center_x, center_y) in enumerate(current_positions):
                predicted = kf.predict(center_x, center_y)
                if predicted is not None:
                    predicted_x, predicted_y = predicted
                    last_predicted = (predicted_x, predicted_y)

        if frame_number == int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) and last_predicted :
            while last_predicted[1] > DETECTED_BOXES[0][1] or last_predicted[1] > DETECTED_BOXES[1][1]:
                print("predicting ball", last_predicted,DETECTED_BOXES[0][1],DETECTED_BOXES[1][1])
                if last_predicted:
                    last_predicted = kf.predict(last_predicted[0], last_predicted[1])
                    cv2.circle(frame, (int(last_predicted[0]), int(last_predicted[1])), 7, (0, 255, 0), -1)
                    object_positions.append([(int(last_predicted[0]), int(last_predicted[1]))])
                if last_predicted[0] < 0:
                    break
                    
        # Draw connecting lines between consecutive positions
        for i in range(1, len(object_positions)):
            prev_positions = object_positions[i - 1]
            curr_positions = object_positions[i]
            
            # Ensure both frames have detected positions to connect
            if prev_positions and curr_positions:
                # Use the first detected object in each frame (or modify if there are multiple)
                prev_x, prev_y = prev_positions[0]
                curr_x, curr_y = curr_positions[0]
                
                cv2.line(frame, (prev_x, prev_y), (curr_x, curr_y), (255 , 0 ,0), 7)

        previous_positions = current_positions
        out.write(frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        
        
    prev = float('inf')
    for i in object_positions:
        if len(i) > 1:
            continue
        if (prev - i[0][1]) < 0:
            print(i , "positive" , end= " ")
        else:
            print(i, "negative" , end= " ")
        flag = False
        for j in DETECTED_BOXES:
            if j[1] < i[0][1] or j[3] < i[0][1]:
                flag = True
                print("below stump height !!")
                break
        else:
            print("above stump height !!")
            
        prev = i[0][1]
    cap.release()
    out.release()
    cv2.destroyAllWindows()
    shutil.rmtree(temp_dir)

if __name__ == '__main__':
    process_video(input_video_path, output_video_path, stump_img_path)
    print("Coordinates",COORDINATES)
    print("Detected Boxes",DETECTED_BOXES)
