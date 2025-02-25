import { useState } from "react";
import { View, StyleSheet } from "react-native";
import PhotoCapture from "../../components/PhotoCapture";
import VideoRecorder from "../../components/VideoRecorder";

export default function CameraScreen() {
  const [isRecording, setIsRecording] = useState(false); 
  const [photo, setPhoto] = useState(null);

  const handleUploadSuccess = ({ photo, result }) => {
    console.log("Uploaded Image Result:", result);

    if (result.result === true) {
      setIsRecording(true);
      setPhoto(photo);  // Store the captured photo
    }
  };

  const handleRecordingDone = () => {
    setIsRecording(false); // Reset to photo mode after recording
    setPhoto(null);
  };

  return (
    <View style={styles.container}>
      {!isRecording ? (
        <PhotoCapture onUploadSuccess={handleUploadSuccess} />
      ) : (
        <VideoRecorder stump_image={photo}/>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});



