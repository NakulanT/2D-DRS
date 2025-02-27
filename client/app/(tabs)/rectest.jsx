import React, { useState, useRef } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Image, Button } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";

export default function rectest() {
  const [facing, setFacing] = useState("back");
  const [photo, setPhoto] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef(null);

  // Request Camera & Microphone Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  if (!cameraPermission || !micPermission) {
    return <View />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need camera & microphone permissions</Text>
        <Button
          onPress={() => {
            requestCameraPermission();
            requestMicPermission();
          }}
          title="Grant Permissions"
        />
      </View>
    );
  }

  // Flip Camera
  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  // Take a Photo
  async function takePhoto() {
    if (cameraRef.current) {
      const photoData = await cameraRef.current.takePictureAsync();
      setPhoto(photoData.uri);
      console.log("Photo Taken:", photoData.uri);

      // Upload the photo
      await uploadPhoto(photoData.uri);
    }
  }

  // Upload Photo to Backend
  async function uploadPhoto(uri) {
    const formData = new FormData();
    formData.append("file", {
      uri: uri,
      name: "image.jpg",
      type: "image/jpeg",
    });

    try {
      const response = await fetch("http://0.0.0.0:8000/check_stumps", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const result = await response.json();
      console.log("Photo Upload Success:", result);

      // Start video recording after successful upload
      startRecording();
    } catch (error) {
      console.error("Photo Upload Error:", error);
    }
  }

  // Start Video Recording
  async function startRecording() {
    if (cameraRef.current) {
      setRecording(true);
      try {
        const video = await cameraRef.current.recordAsync();
        console.log("Recorded Video:", video.uri);

        // Move video to cache
        const cacheUri = `${FileSystem.cacheDirectory}recordedVideo.mp4`;
        await FileSystem.moveAsync({
          from: video.uri,
          to: cacheUri,
        });

        setVideoUri(cacheUri);
        console.log("Saved Video in Cache:", cacheUri);
      } catch (error) {
        console.error("Video Recording Error:", error);
      } finally {
        setRecording(false);
      }
    }
  }

  // Stop Video Recording
  function stopRecording() {
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
      setRecording(false);
    }
  }

  // Cancel Photo Preview
  function cancelPreview() {
    setPhoto(null);
  }

  return (
    <View style={styles.container}>
      {!photo ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} mode="video">
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                <Text style={styles.text}>Flip Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={takePhoto}>
                <Text style={styles.text}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.preview} />
          <TouchableOpacity style={styles.cancelButton} onPress={cancelPreview}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.okButton} onPress={cancelPreview}>
            <Text style={styles.okText}>OK</Text>
          </TouchableOpacity>
        </View>
      )}

      {videoUri && (
        <View>
          <Text style={styles.text}>Video Saved in Cache: {videoUri}</Text>
        </View>
      )}

      {recording && (
        <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
          <Text style={styles.text}>Stop Recording</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    backgroundColor: "transparent",
    paddingBottom: 20,
  },
  button: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 10,
  },
  stopButton: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignSelf: "center",
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  previewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  preview: {
    width: "100%",
    height: "80%",
    resizeMode: "contain",
  },
  cancelButton: {
    marginTop: 10,
    backgroundColor: "red",
    padding: 10,
    borderRadius: 10,
  },
  okButton: {
    marginTop: 10,
    backgroundColor: "green",
    padding: 10,
    borderRadius: 10,
  },
  cancelText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  okText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});
