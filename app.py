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
ball_detection_model = YOLO('ball_segmentation.pt').to(device)
stump_detection_model = YOLO('stump_detection.pt').to(device)
stump_img_path = 'frame6.jpg'
input_video_path = 'video24.mp4'
output_video_path = 'output_video.mp4'
output_image_path = "output_imge.jpg"

COORDINATES = {} # format {'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0}
DETECTED_BOXES = []
CROPS = []
TEMP_DIR = None
BELOW_STUMP = False
PITCH_BOUNCE = False
PIXEL_VALUES = []
IN_LINE = []
PITCH_POINT = None
IMPACT_POINT = None

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
    global DETECTED_BOXES,IN_LINE
    annotated_image = image.copy()
    
    if not DETECTED_BOXES:
        results = stump_detection_model(stump_img)[0]
        for i, box in enumerate(results.boxes.xyxy):
            cls = int(results.boxes.cls[i])
            class_label = results.names[cls]
            
            if class_label == class_name:
                x1, y1, x2, y2 = map(int, box)
                DETECTED_BOXES.append((x1, y1, x2, y2))
    
    if len(DETECTED_BOXES) == 2:
        (x1a, y1a, x2a, y2a), (x1b, y1b, x2b, y2b) = DETECTED_BOXES
        pts = np.array([[x2b, y2b], [x2a, y2a], [x1a, y2a], [x1b, y2b]], np.int32).reshape((-1, 1, 2))
        IN_LINE = [[x2b, y2b], [x2a, y2a], [x1a, y2a], [x1b, y2b]]
        overlay = np.zeros_like(annotated_image)
        cv2.fillPoly(overlay, [pts], (128, 128, 128))
        cv2.addWeighted(overlay, 0.35, annotated_image, 0.65, 0, annotated_image)
        cv2.line(annotated_image, (x1a, y2a), (x1b, y2b), (128, 128, 128), 1)
        cv2.line(annotated_image, (x2a, y2a), (x2b, y2b), (128, 128, 128), 1)
        
    return annotated_image

def process_video(input_video_path, output_video_path, stump_img_path):
    global COORDINATES , BELOW_STUMP ,PITCH_BOUNCE , PIXEL_VALUES, PITCH_POINT, IMPACT_POINT
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
            masks = result.masks  # Get the segmentation masks (may be None)

            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                COORDINATES['x1'] = x1
                COORDINATES['y1'] = y1
                COORDINATES['x2'] = x2
                COORDINATES['y2'] = y2

                # Calculate the area from bounding box
                area = (x2 - x1) * (y2 - y1)
                
                # Check if masks are available before proceeding
                if masks is not None:
                    for mask in masks:
                        # Access the raw mask data
                        mask_data = mask.data.cpu().numpy()  # Convert to NumPy array if it's a tensor

                        # Ensure mask is 2D
                        if mask_data.ndim > 2:  # If the mask has more than 2 dimensions (e.g., multi-channel)
                            mask_data = np.sum(mask_data, axis=0)  # Sum over the channels to get a single-channel mask
                        
                        # Convert to binary mask (threshold > 0.5)
                        mask_data = (mask_data > 0.5).astype(np.uint8)

                        # Count the segmented pixels
                        segmented_pixels = np.sum(mask_data)  # Count the segmented pixels
                        PIXEL_VALUES.append((area, segmented_pixels))
                else:
                    print("No masks available for this detection.")

                # Calculate the center of the bounding box
                center_x = (x1 + x2) // 2
                center_y = (y1 + y2) // 2
                current_positions.append((center_x, center_y))


                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        if current_positions:
            object_positions.append(current_positions)
        
        
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
                    
        # Draw connecting lines between consecutive positions of detected objects
        for i in range(1, len(object_positions)):
            prev_positions = object_positions[i - 1]
            curr_positions = object_positions[i]
            
            # Ensure both frames have detected positions to connect
            if prev_positions and curr_positions:
                # Use the first detected object in each frame (or modify if there are multiple)
                prev_x, prev_y = prev_positions[0]
                curr_x, curr_y = curr_positions[0]
                
                # Create an overlay
                overlay = frame.copy()
                
                # Draw line on the overlay
                cv2.line(overlay, (prev_x, prev_y), (curr_x, curr_y), (0, 0, 255), 7)
                # Blend the overlay with the original frame
                opacity = 0.5  # Adjust the opacity level (0.0 to 1.0)
                frame = cv2.addWeighted(overlay, opacity, frame, 1 - opacity, 0)
                    
        
        if frame_number == int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) and last_predicted :            
            
            predicted_positions = [object_positions[-1]]
            while last_predicted[1] > DETECTED_BOXES[0][1] or last_predicted[1] > DETECTED_BOXES[1][1]:
                if last_predicted:
                    last_predicted = kf.predict(last_predicted[0], last_predicted[1])
                    # cv2.circle(frame, (int(last_predicted[0]), int(last_predicted[1])), 7, (0, 255, 0), -1)
                    predicted_positions.append([(int(last_predicted[0]), int(last_predicted[1]))])
                if last_predicted[0] < 0:
                    break
                    
            
            # Draw connecting lines between consecutive positions of predicted objects
            for i in range(1, len(predicted_positions)):
                prev_positions = predicted_positions[i - 1]
                curr_positions = predicted_positions[i]
                
                # Ensure both frames have detected positions to connect
                if prev_positions and curr_positions:
                    # Use the first detected object in each frame (or modify if there are multiple)
                    prev_x, prev_y = prev_positions[0]
                    curr_x, curr_y = curr_positions[0]
                    
                    # Create an overlay
                    overlay = frame.copy()
                    
                    # Draw line on the overlay
                    cv2.line(overlay, (prev_x, prev_y), (curr_x, curr_y), ((255, 0, 0)), 7)
                    
                    # Blend the overlay with the original frame
                    opacity = 0.5  # Adjust the opacity level (0.0 to 1.0)
                    frame = cv2.addWeighted(overlay, opacity, frame, 1 - opacity, 0)
            if len(predicted_positions) > 0:
                cx,cy = predicted_positions[-1][0]
                cv2.circle(frame, (cx, cy), 5, (0, 0, 128), -1)
            
                IMPACT_POINT = object_positions[-1][0]
                cv2.circle(frame, (IMPACT_POINT[0], IMPACT_POINT[1]), 5, (0, 0, 128), -1)
                
                PITCH_POINT = find_pitch_point(object_positions)
                cv2.circle(frame, (PITCH_POINT[0], PITCH_POINT[1]), 5, (0, 0, 128), -1)
                
            #Saving the last frame
            cv2.imwrite(output_image_path, frame)
            

        previous_positions = current_positions 
        
        out.write(frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    


    cap.release()
    out.release()
    cv2.destroyAllWindows()
    shutil.rmtree(temp_dir)

PITCH_FRAME = None
# Function to find the pitch point
def find_pitch_point(object_positions):
    global PITCH_FRAME 
    pitch_point = None
    moving_up = False
    prev = [(-1 , float('inf'))]
    for ind, n in enumerate(object_positions):
        if len(n) > 1:
            continue
        if (prev[0][1] - n[0][1]) < 0:
            moving_up = False
        else:
            moving_up = True
        #checking if the ball is under the stump and moving up
        for j in DETECTED_BOXES:
            if j[1] < n[0][1] or j[3] < n[0][1]:
                if moving_up and not pitch_point and ind > 10:
                    print("object positions",object_positions[:ind])
                    pitch_point = prev[0]
                break
        prev = n
    if pitch_point:
        PITCH_FRAME = ind
        return pitch_point
    return [-1,-1]

def is_point_inside_zone(point, zone_coordinates):
    zone_polygon = np.array(zone_coordinates, np.int32).reshape((-1, 1, 2))
    result = cv2.pointPolygonTest(zone_polygon, point, False)
    return result >= 0  


def check_point_in_polygon(detected_boxes, point):
    detected_boxes = sorted(detected_boxes, key=lambda box: box[1])  # Sort by y1

    # Step 2: Define the polygon using the specified connections
    (x1a, y1a, x2a, y2a), (x1b, y1b, x2b, y2b) = detected_boxes
    polygon_points = [
        [x2a, y1a],  # Upper right of first box
        [x2b, y2b],  # Lower right of second box
        [x1b, y2b],  # Lower left of second box
        [x1a, y1a],  # Upper left of first box
    ]
    
    # Convert polygon points to the required NumPy format
    polygon = np.array(polygon_points, np.int32).reshape((-1, 1, 2))

    # Step 3: Check if the point lies inside the polygon
    result = cv2.pointPolygonTest(polygon, point, False)
    return result >= 0  # True if inside or on the edge, False otherwise

def draw_smooth_curve(object_positions, frame):
    # Extract points from object_positions
    points = np.array([pos[0] for pos in object_positions], dtype=np.int32)

    # Create an overlay to draw the curve
    overlay = frame.copy()

    # Generate a smooth curve using polynomial fitting
    if len(points) > 3:  # Ensure we have enough points for smoothing
        degree = 3  # Degree of the polynomial fit
        x, y = points[:, 0], points[:, 1]
        z = np.polyfit(x, y, degree)  # Polynomial fit
        p = np.poly1d(z)  # Create polynomial equation

        # Generate smooth x and y values
        x_smooth = np.linspace(min(x), max(x), 300)
        y_smooth = p(x_smooth).astype(int)
        
        # Stack x and y for smooth points
        smooth_points = np.column_stack((x_smooth.astype(int), y_smooth))
        
        # Draw the smooth curve
        cv2.polylines(overlay, [smooth_points], isClosed=False, color=(0, 0, 255), thickness=3)
    else:
        # If not enough points for a curve, draw simple lines between points
        cv2.polylines(overlay, [points], isClosed=False, color=(0, 0, 255), thickness=3)

    # Blend the overlay with the original frame
    opacity = 0.5  # Adjust the opacity level (0.0 to 1.0)
    frame = cv2.addWeighted(overlay, opacity, frame, 1 - opacity, 0)

    return frame

if __name__ == '__main__':
    process_video(input_video_path, output_video_path, stump_img_path)
    
    print("Device",device)
    print("Pitching on Inline : ",is_point_inside_zone(PITCH_POINT, IN_LINE))
    print("Impact on Inline : ",check_point_in_polygon(DETECTED_BOXES, IMPACT_POINT))