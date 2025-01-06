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
stump_img_path = 'frame4.jpg'
input_video_path = 'video25.mp4'
output_video_path = 'output_video.mp4'
output_image_path = "output_image.jpg"

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
HITTING_STUMPS = None
RESULT_FRAME = None

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
    global COORDINATES , BELOW_STUMP ,PITCH_BOUNCE , PIXEL_VALUES, PITCH_POINT, IMPACT_POINT, HITTING_STUMPS, RESULT_FRAME
    kf = KalmanFilter()
    cap = cv2.VideoCapture(input_video_path)

    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (frame_width, frame_height))
    object_positions_before_pitch = []
    object_positions_after_pitch = []
    previous_positions = []
    frame_number = 0
    selected_stump= None
    seaming = None
    

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
        if PITCH_BOUNCE and current_positions and len(object_positions_after_pitch) > 1 and seaming:
            if seaming == "Right":
                if current_positions[0][0] > object_positions_after_pitch[-1][0][0]:
                    print("seaming opposite side !!")
            if seaming == "Left":
                if current_positions[0][0] < object_positions_after_pitch[-1][0][0]:
                    print("seaming opposite side !!")
                    

        
        if not selected_stump:  #selected stumps holds the coordinates of the batting stumps
            selected_stump = min(DETECTED_BOXES, key=lambda stump: stump[1])
        
        if not BELOW_STUMP and current_positions and current_positions[0][1] > selected_stump[1] :
            print("Ball below stump height !!")
            BELOW_STUMP = True
        
        if BELOW_STUMP and current_positions and current_positions[0][1] < selected_stump[1]:
            print("Ball above stump height !!")
            BELOW_STUMP = False
        
        if BELOW_STUMP and not PITCH_BOUNCE and previous_positions and current_positions:
            if current_positions[0][1] < previous_positions[0][1]:
                PITCH_POINT = previous_positions[0]
                PITCH_BOUNCE = True
                object_positions_before_pitch = remove_extra_detections(object_positions_before_pitch)
            
        if PITCH_BOUNCE and current_positions:
            object_positions_after_pitch.append(current_positions)
        elif current_positions:
            object_positions_before_pitch.append(current_positions)
            
        if PITCH_BOUNCE and current_positions and len(object_positions_after_pitch) > 1 and not seaming:
            if object_positions_after_pitch[-1][0][0] < object_positions_after_pitch[-2][0][0]:
                seaming = "Right"
            elif object_positions_after_pitch[-1][0][0] > object_positions_after_pitch[-2][0][0]:
                seaming = "Left"
                
            
        # Draw connecting lines between consecutive positions of detected objects
        for i in range(1, len(object_positions_before_pitch)):
            prev_positions = object_positions_before_pitch[i - 1]
            curr_positions = object_positions_before_pitch[i]
            
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
        
        if object_positions_after_pitch and object_positions_before_pitch:
            cv2.line(frame, object_positions_before_pitch[-1][0], object_positions_after_pitch[0][0], (0, 0, 255), 7)

            
        if len(object_positions_after_pitch) > 1:

                # Get the first detected position
                first_positions = object_positions_after_pitch[0]
                # Get the last detected position
                last_positions = object_positions_after_pitch[-1]
                
                # Ensure both frames have detected positions to connect
                if first_positions and last_positions:
                    # Use the first detected object in the first and last frames 
                    first_x, first_y = first_positions[0]
                    last_x, last_y = last_positions[0]
                    
                    # Create an overlay
                    overlay = frame.copy()
                    
                    # 1. Draw the line connecting the first and last points (in red)
                    cv2.line(overlay, (first_x, first_y), (last_x, last_y), (0, 0, 255), 7)
                    
                    # Blend the overlay with the original frame
                    opacity = 0.5  # Adjust the opacity level (0.0 to 1.0)
                    frame = cv2.addWeighted(overlay, opacity, frame, 1 - opacity, 0)

        
        if frame_number == int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) :
            y_limit = min(DETECTED_BOXES[0][1], DETECTED_BOXES[1][1])
            HITTING_STUMPS = object_positions_after_pitch[-1][0] 

            # Draw connecting lines between consecutive positions of detected objects
            if len(object_positions_after_pitch) > 1 and BELOW_STUMP:
                # Get the first detected position
                first_positions = object_positions_after_pitch[0]
                # Get the last detected position
                last_positions = object_positions_after_pitch[-1]
                
                # Ensure both frames have detected positions to connect
                if first_positions and last_positions:
                    # Use the first detected object in the first and last frames
                    first_x, first_y = first_positions[0]
                    last_x, last_y = last_positions[0]
                    
                    # Create an overlay
                    overlay = frame.copy()
                    
                    # 1. Draw the line connecting the first and last points (in red)
                    cv2.line(overlay, (first_x, first_y), (last_x, last_y), (0, 0, 255), 7)
                    
                    # Blend the overlay with the original frame
                    opacity = 0.5  # Adjust the opacity level (0.0 to 1.0)
                    frame = cv2.addWeighted(overlay, opacity, frame, 1 - opacity, 0)
                    
                    # Calculate the slope of the line
                    if last_y != first_y:  # Avoid division by zero
                        slope = (last_x - first_x) / (last_y - first_y)
                    else:
                        slope = float('inf')  # Vertical line

                    # Calculate the x-coordinate for the y_limit based on the slope
                    if slope != float('inf'):
                        extended_x = int(last_x + slope * (y_limit - last_y))
                    else:
                        extended_x = last_x  # For a vertical line, x remains constant
                    
                    # 2. Draw the extended predicted line to the y_limit (in blue)
                    cv2.line(frame, (last_x, last_y), (extended_x, y_limit), (255, 0, 0), 7) 
                    opacity = 0.5  # Adjust the opacity level (0.0 to 1.0)
                    frame = cv2.addWeighted(overlay, opacity, frame, 1 - opacity, 0)
                    
                    HITTING_STUMPS = (extended_x, y_limit) 
            

            IMPACT_POINT = object_positions_after_pitch[-1][0]   
            
            RESULT_FRAME = frame
            print("Seaming" , seaming)
        previous_positions = current_positions 
        
        out.write(frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    out.release()
    cv2.destroyAllWindows()
    shutil.rmtree(temp_dir)
    
def remove_extra_detections(object_positions):
    object_positions.reverse()
    prev = float('inf')
    for ind , pos in enumerate(object_positions):
        if pos[0][1] > prev:
            break
        prev = pos[0][1]
    object_positions = object_positions[:ind]
    object_positions.reverse()
    return object_positions

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


def check_point_in_polygon_or_side(detected_boxes, point, offside):
    # Step 1: Sort bounding boxes based on y1 in ascending order
    detected_boxes = sorted(detected_boxes, key=lambda box: box[1])  # Sort by y1

    # Define the polygon using the edges of the detected boxes
    (x1a, y1a, x2a, y2a), (x1b, y1b, x2b, y2b) = detected_boxes
    polygon = [
        [x2a, y1a],  # Upper right of first box
        [x2b, y2b],  # Lower right of second box
        [x1b, y2b],  # Lower left of second box
        [x1a, y1a],  # Upper left of first box
    ]
    # Extract the point's y-coordinate
    _, y = point
    x_values = []

    # Check if the y-coordinate intersects the polygon
    for i in range(len(polygon)):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % len(polygon)]  # Wrap around to form a closed polygon

        # Check if the point's y lies within the edge's y range
        if min(y1, y2) <= y <= max(y1, y2) and y1 != y2:  # Avoid division by zero
            # Calculate x-coordinate using linear interpolation
            x = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            x_values.append(x)

    # Sort x-values to get boundaries
    x_values = sorted(x_values)
    
    if len(x_values) == 2:
        if x_values[0] <= point[0] <= x_values[1]:
            return "In Line"
        elif point[0] < x_values[0]:
            return "Outside off"
        elif point[0] > x_values[1]:
            return "Outside leg"
        
    return False

def hitting_stumps(stump_coordinates, point):
    # Find the stump with the lowest y1 value
    selected_stump = min(stump_coordinates, key=lambda stump: stump[1])
    
    x1, y1, x2, y2 = selected_stump
    x, y = point
    
    # Check if the point is within the bounds of the selected stump rectangle
    if x1 <= x <= x2 and y1 <= y <= y2:
        return "Hitting"
    return "Not-hitting"

def draw_result(player):
    global RESULT_FRAME, DETECTED_BOXES, IMPACT_POINT, PITCH_POINT, HITTING_STUMPS
    
    # Determine impact, pitching, and hitting stumps
    impact = check_point_in_polygon(DETECTED_BOXES, IMPACT_POINT)
    if player == "right_handed":
        pitching = check_point_in_polygon_or_side(DETECTED_BOXES, PITCH_POINT, True)
        desired_side = "Outside off"
    else:
        pitching = check_point_in_polygon_or_side(DETECTED_BOXES, PITCH_POINT, False)
        desired_side = "Outside leg"
    
    hitting_text = hitting_stumps(DETECTED_BOXES, HITTING_STUMPS)
    impact_text = "Inside" if impact else "Outside"
    pitching_text = pitching
    
    # Define font and styling attributes
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.8
    font_thickness = 2
    colors = {
        "header_bg": (0, 0, 0),     # Black for headers
        "text": (255, 255, 255),    # White text
        "border": (200, 200, 200),  # Gray border
        "result_bg_red": (0, 0, 255),  # Red for default results
        "result_bg_green": (0, 255, 0),  # Green for successful results
    }
    line_type = cv2.LINE_AA

    # Define the header-result text pairs
    texts = [
        ("WICKETS", hitting_text, hitting_text == "Hitting"),  # Green if hitting stumps
        ("IMPACT", impact_text, impact),                  # Green if impact is "Inside"
        ("PITCHING", pitching_text,pitching == "In Line" or pitching == desired_side),               # Default color for pitching
    ]

    # Box dimensions and layout settings
    x_offset, y_offset = 20, 50
    box_width, box_height = 220, 50
    spacing = 10

    # Function to draw a box with centered text
    def draw_box_with_text(frame, top_left, width, height, bg_color, text, text_color):
        # Draw the box
        bottom_right = (top_left[0] + width, top_left[1] + height)
        cv2.rectangle(frame, top_left, bottom_right, colors["border"], thickness=2)
        cv2.rectangle(frame, (top_left[0] + 2, top_left[1] + 2), 
                      (bottom_right[0] - 2, bottom_right[1] - 2), bg_color, thickness=-1)
        
        # Add centered text
        text_size, _ = cv2.getTextSize(text, font, font_scale, font_thickness)
        text_x = top_left[0] + (width - text_size[0]) // 2
        text_y = top_left[1] + (height + text_size[1]) // 2
        cv2.putText(frame, text, (text_x, text_y), font, font_scale, text_color, font_thickness, line_type)

    # Draw header-result pairs
    for header, result, success in texts:
        # Determine result box color
        result_bg_color = colors["result_bg_red"] if success else colors["result_bg_green"]
        
        # Draw header box
        draw_box_with_text(RESULT_FRAME, (x_offset, y_offset), box_width, box_height, colors["header_bg"], header, colors["text"])
        
        # Draw result box below the header
        draw_box_with_text(RESULT_FRAME, (x_offset, y_offset + box_height), box_width, box_height, result_bg_color, result, colors["text"])
        
        # Update y_offset for the next pair
        y_offset += 2 * box_height + spacing

    # Save the final image
    cv2.imwrite(output_image_path, RESULT_FRAME)



if __name__ == '__main__':
    process_video(input_video_path, output_video_path, stump_img_path)
    print("Device",device)
    draw_result("right_handed")