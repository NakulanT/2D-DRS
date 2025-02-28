import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Image, 
  Alert,
  SafeAreaView,
  Dimensions,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PhotoCapture({ onUploadSuccess }) {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionMessage}>
          We need your permission to use the camera for taking photos.
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  async function takePhoto() {
    if (cameraRef.current) {
      const photoData = await cameraRef.current.takePictureAsync({
        quality: 1,
        ratio: '16:9',
      });
      console.log('Original photo:', { uri: photoData.uri, width: photoData.width, height: photoData.height });
      setPhoto(photoData.uri);
    }
  }

  async function uploadPhoto(uri) {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: 'image.jpg',
      type: 'image/jpeg',
    });

    try {
      const response = await fetch('https://e9e8-120-56-194-121.ngrok-free.app/check_stumps', {
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
    } finally {
      setUploading(false);
    }
  }

  function cancelPreview() {
    setPhoto(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {!photo ? (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={[styles.camera, { width: screenWidth, height: screenHeight }]}
            facing={facing}
            onTap={(event) => cameraRef.current?.focus(event.nativeEvent)}
          >
            {/* Camera UI Overlay */}
            <View style={styles.overlayContainer}>
              {/* Top Bar */}
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing}>
                  <Ionicons name="camera-reverse" size={28} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <Ionicons name="flash-off" size={28} color="white" />
                </TouchableOpacity>
              </View>
              
              {/* Center Viewfinder */}
              <View style={styles.viewfinder}>
                <View style={styles.viewfinderBorder} />
              </View>
              
              {/* Bottom Controls */}
              <View style={styles.bottomControls}>
                <View style={styles.captureButtonContainer}>
                  <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </CameraView>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.preview} />
          
          {uploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          ) : (
            <View style={styles.previewControls}>
              <TouchableOpacity 
                style={[styles.previewButton, styles.cancelButton]} 
                onPress={cancelPreview}
              >
                <Ionicons name="close" size={24} color="white" />
                <Text style={styles.previewButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.previewButton, styles.confirmButton]} 
                onPress={() => uploadPhoto(photo)}
              >
                <Ionicons name="checkmark" size={24} color="white" />
                <Text style={styles.previewButtonText}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  permissionButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 24,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderBorder: {
    width: '70%',
    height: '50%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  captureButtonContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#000',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#E53935',
  },
  confirmButton: {
    backgroundColor: '#43A047',
  },
  previewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  uploadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  uploadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
});