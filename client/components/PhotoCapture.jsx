import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Image, Alert } from 'react-native';
import ImageResizer from 'react-native-image-resizer';

export default function PhotoCapture({ onUploadSuccess }) {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  async function takePhoto() {
    if (cameraRef.current) {
      const photoData = await cameraRef.current.takePictureAsync({
        quality: 1, // Highest quality
        ratio: '16:9', // Base ratio, flipped to 9:16 in portrait
      });
      console.log('Original photo:', { uri: photoData.uri, width: photoData.width, height: photoData.height });

      // Resize to 1080x1920
      try {
        const resized = await ImageResizer.createResizedImage(
          photoData.uri,
          1080, // Target width
          1920, // Target height
          'JPEG', // Format
          100, // Quality (0-100)
          0, // Rotation (0 for portrait)
          FileSystem.cacheDirectory // Output directory
        );
        console.log('Resized photo:', { uri: resized.uri, width: resized.width, height: resized.height });
        setPhoto(resized.uri);
      } catch (error) {
        console.error('Resize error:', error);
        Alert.alert('Error', 'Failed to resize photo');
        setPhoto(photoData.uri); // Fallback to original if resize fails
      }
    }
  }

  async function uploadPhoto(uri) {
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: 'image.jpg',
      type: 'image/jpeg',
    });

    try {
      const response = await fetch('https://9f71-120-56-197-68.ngrok-free.app/check_stumps', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload Success:', result);

      if (onUploadSuccess) {
        onUploadSuccess({ photo: uri, result });
      }
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Failed', error.message);
    }
  }

  function cancelPreview() {
    setPhoto(null);
  }

  return (
    <View style={styles.container}>
      {!photo ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          onTap={(event) => cameraRef.current?.focus(event.nativeEvent)}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Text style={styles.text}>Flip Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={takePhoto}>
              <Text style={styles.text}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.preview} />
          <TouchableOpacity style={styles.cancelButton} onPress={cancelPreview}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.okButton} onPress={() => uploadPhoto(photo)}>
            <Text style={styles.okText}>OK</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
  },
  camera: {
    flex: 1,
    aspectRatio: 9 / 16, // Portrait 9:16 for 1080x1920
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    paddingBottom: 20,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 10,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  preview: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  cancelButton: {
    marginTop: 10,
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 10,
  },
  okButton: {
    marginTop: 10,
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 10,
  },
  cancelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  okText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});