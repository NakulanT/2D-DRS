import { CameraView } from "expo-camera";
import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export default function VideoRecorder({ stump_image }) {
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Camera and storage permission is needed!");
      }
    })();
  }, []);

  async function startRecording() {
    if (!cameraRef.current) {
      console.error("Camera reference is null!");
      return;
    }
    if (cameraRef.current) {
      try {
        console.log("Recording started...");
        setRecording(true);

        const videoData = await cameraRef.current.recordAsync({ quality: Camera.Constants.VideoQuality["720p"] });
        
        if (!videoData || !videoData.uri) {
          console.error("Failed to capture video!");
          return;
        }

        console.log("Video captured:", videoData.uri);
        setRecording(false);
        setVideoUri(videoData.uri);

        // Save to cache
        const cachedVideoPath = `${FileSystem.cacheDirectory}recorded_video.mp4`;
        const cachedImagePath = `${FileSystem.cacheDirectory}stump.jpg`;

        try {
          // Move video to cache
          await FileSystem.moveAsync({
            from: videoData.uri,
            to: cachedVideoPath,
          });
          console.log("Cached Video:", cachedVideoPath);

          // Copy the stump image to cache
          await FileSystem.copyAsync({
            from: stump_image,
            to: cachedImagePath,
          });
          console.log("Cached Image:", cachedImagePath);

          // Upload files
          await uploadData(cachedVideoPath, cachedImagePath);
        } catch (error) {
          console.error("Error caching files:", error);
        }
      } catch (error) {
        console.error("Error recording video:", error);
      }
    } else {
      console.error("Camera reference is null!");
    }
  }

  async function stopRecording() {
    if (cameraRef.current && recording) {
      try {
        console.log("Stopping Recording...");
        await cameraRef.current.stopRecording();
        setRecording(false);
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
    } else {
      console.warn("No active recording to stop.");
    }
  }

  async function uploadData(videoPath, imagePath) {
    let formData = new FormData();

    formData.append("video", {
      uri: videoPath,
      name: "video.mp4",
      type: "video/mp4",
    });

    formData.append("stump_img", {
      uri: imagePath,
      name: "stump.jpg",
      type: "image/jpeg",
    });

    try {
      console.log("Uploading files...");
      const response = await fetch("https://7da3-120-56-199-19.ngrok-free.app/finalResult", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const result = await response.json();
      console.log("Upload Success:", result);
    } catch (error) {
      console.error("Upload Error:", error);
    }
  }

  return (
    <View style={styles.container}>
      {!videoUri ? (
        <CameraView ref={cameraRef} style={styles.camera}>
          <TouchableOpacity style={styles.button} onPress={recording ? stopRecording : startRecording}>
            <Text style={styles.text}>{recording ? "Stop Recording" : "Record Video"}</Text>
          </TouchableOpacity>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <Text style={styles.text}>Video Recorded</Text>
          <TouchableOpacity style={styles.button} onPress={() => setVideoUri(null)}>
            <Text style={styles.text}>Record Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  camera: { flex: 1 },
  button: { backgroundColor: "black", padding: 10, borderRadius: 10, margin: 10 },
  text: { color: "white", fontSize: 16, textAlign: "center" },
  previewContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
