# LBW Decision System README

## Overview
The LBW (Leg Before Wicket) Decision System is a native application designed to automate LBW decisions in cricket using computer vision techniques. It utilizes a single 2D camera to process video footage, detect key events (ball pitch, impact, and trajectory), and determine whether the ball would hit the stumps based on cricket LBW rules. The system leverages the YOLOv8 model for object detection (ball and stumps) and employs custom logic to analyze the ball's trajectory.

This project is developed using Python and integrates libraries such as OpenCV, PyTorch, and Ultralytics YOLO for real-time video processing and analysis.

---

## Features
- **Stump Detection:** Identifies the batting and bowling stumps from a reference image to define the in-pitch zone.
- **Ball Tracking:** Detects and tracks the cricket ball in video frames using YOLOv8 segmentation.
- **Key Event Detection:**
  - **Pitch Point:** Determines where the ball pitches by analyzing its y-coordinate and pixel intensity changes.
  - **Impact Point:** Identifies the point of impact (e.g., with the batsman’s pad) based on sudden changes in ball movement.
  - **Trajectory Prediction:** Extends the ball’s path post-impact to predict whether it would hit the stumps.
- **Visualization:** Overlays the ball trajectory, stump zones, and decision results on the video output.
- **Result Display:** Provides a graphical summary of the LBW decision (Pitching, Impact, Wickets) with color-coded indicators.

---

## Prerequisites
To run this project, ensure you have the following installed:
1. **Python 3.8+**
2. **PyTorch** (with CUDA support for GPU acceleration, if available)
3. **OpenCV** (`opencv-python`)
4. **Ultralytics YOLO** (`ultralytics`)
5. **NumPy**

### Installation
1. Clone or download this repository:
   ```
   git clone <repository-url>
   cd lbw-decision-system
   ```
2. Install the required dependencies:
   ```
   pip install torch torchvision torchaudio
   pip install opencv-python numpy ultralytics
   ```
3. Download the pretrained YOLOv8 models:
   - `ball_segmentation.pt`: Model for detecting and segmenting the cricket ball.
   - `stump_detection.pt`: Model for detecting stumps.
   Place these files in the project directory.

   ```

---

## Usage
1. Prepare your input files:
   - A video file (e.g., `input_video.mp4`) containing the LBW event.
   - A reference image (e.g., `stumps.jpg`) showing the stumps for detection.

2. Run the system:
   ```python
   from lbw_detection import LBWDetectionModel

   # Initialize the model
   lbw_model = LBWDetectionModel()

   # Process the video and get results
   result = lbw_model.get_result(
       input_video_path="input_video.mp4",
       stump_img_path="stumps.jpg"
   )
   print(result)
   ```

3. Output:
   - **Processed Video:** Saved as `output_video.mp4` with ball tracking and trajectory overlays.
   - **Result Image:** Saved as `output_image.jpg` with the LBW decision summary (Pitching, Impact, Wickets).

---

## Methodology
The system processes the LBW decision in the following steps:

1. **Stump Detection:**
   - Uses `stump_detection.pt` to detect the batting and bowling stumps from a static image.
   - Defines the in-pitch zone by connecting the stumps and overlays it on the video.

2. **Ball Detection and Tracking:**
   - Uses `ball_segmentation.pt` to detect the ball in each video frame.
   - Tracks the ball’s center coordinates (`cx`, `cy`) across frames.

3. **Pitch Detection:**
   - Monitors the ball’s `y`-coordinate relative to the batting stump’s top.
   - Identifies the pitch point when the ball’s `y`-value decreases after traveling below the stump height (indicating a bounce).

4. **Impact Detection:**
   - Detects a sudden change in the ball’s `x` or `y` movement post-pitch (e.g., hitting the pad).
   - Stores the impact coordinates.

5. **Trajectory Prediction:**
   - Extends the line from the pitch point to the impact point.
   - Calculates the extended trajectory based on pitch distance:
     - If pitched within a threshold (e.g., ~5m), assumes the ball stays low enough to hit the stumps.
     - If pitched farther, assumes it rises above the stumps.
   - Checks if the extended path intersects the stumps.

6. **Decision Rendering:**
   - Evaluates:
     - **Pitching:** In-line, outside off, or outside leg.
     - **Impact:** Inside or outside the stumps.
     - **Wickets:** Hitting or missing the stumps.
   - Displays results with color-coded boxes (red for positive, green for negative).

---

## Code Structure
- **LBWDetectionModel Class:**
  - `__init__`: Initializes models, paths, and state variables.
  - `detect_and_crop`: Detects and crops stumps from the reference image.
  - `process_video`: Main function to process video frames, track the ball, and predict the trajectory.
  - `prediction_extention_point`: Calculates the extended trajectory and stump intersection.
  - `draw_result`: Renders the LBW decision on the final frame.
  - `get_result`: Orchestrates the full pipeline from video input to result output.

---

## Limitations
- Requires high-quality video input with clear visibility of the ball and stumps.
- Assumes a fixed camera angle aligned with the pitch.
- Trajectory prediction is simplified and may not account for spin, swing, or complex bounces.
- Performance depends on the accuracy of the pretrained YOLOv8 models.

---

## Future Improvements
- Integrate a physics-based trajectory model for more accurate predictions.
- Support multiple camera angles or 3D reconstruction.
- Train custom YOLO models on a larger cricket dataset for better detection.
- Add real-time processing capabilities for live matches.

---

## License
This project is for educational and experimental purposes. Ensure compliance with cricket broadcasting regulations if used commercially.

---

## Contact
For questions or contributions, feel free to reach out.

---
