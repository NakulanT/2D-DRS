import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  Modal,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video } from 'expo-video';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

export default function VideoRecorder({ stump_image }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [video, setVideo] = useState(null);
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to record');
  const cameraRef = useRef(null);
  const timerRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const LOCAL_STORAGE_DIR = `${FileSystem.documentDirectory}VideoRecorder/`;

  // Initialize storage directory and check permissions
  useEffect(() => {
    (async () => {
      try {
        await FileSystem.makeDirectoryAsync(LOCAL_STORAGE_DIR, { intermediates: true });
        setStatusMessage('Storage initialized');
        
        if (!permission || !permission.granted) {
          setStatusMessage('Camera access required');
          await requestPermission();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setStatusMessage('Initialization failed');
      }
    })();
  }, [permission]);

  // Handle stump image if provided
  useEffect(() => {
    (async () => {
      if (stump_image && !image) {
        setLoading(true);
        setStatusMessage('Processing reference image...');
        const fileType = 'image/jpeg';
        const fileName = `stump_${Date.now()}.jpg`;
        const tempUri = `${FileSystem.cacheDirectory}${fileName}`;
        const permanentUri = `${LOCAL_STORAGE_DIR}${fileName}`;

        try {
          await FileSystem.copyAsync({ from: stump_image, to: tempUri });
          const info = await FileSystem.getInfoAsync(tempUri);
          if (!info.exists || info.size === 0) throw new Error('Invalid image file');

          await FileSystem.copyAsync({ from: tempUri, to: permanentUri });
          setImage({ uri: permanentUri, type: fileType, name: fileName });
          setStatusMessage('Reference image ready');
        } catch (error) {
          console.error('Image processing error:', error);
          setStatusMessage('Failed to process reference image');
          Alert.alert('Error', 'Failed to process reference image');
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [stump_image]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const cacheVideo = async (videoUri) => {
    setStatusMessage('Processing video...');
    setLoading(true);
    const fileType = 'video/mp4';
    const fileName = `video_${Date.now()}.mp4`;
    const tempUri = `${FileSystem.cacheDirectory}${fileName}`;
    const permanentUri = `${LOCAL_STORAGE_DIR}${fileName}`;

    try {
      await FileSystem.copyAsync({ from: videoUri, to: tempUri });
      const info = await FileSystem.getInfoAsync(tempUri);
      if (!info.exists || info.size === 0) throw new Error('Invalid video file');

      await FileSystem.copyAsync({ from: tempUri, to: permanentUri });
      const videoFile = { uri: permanentUri, type: fileType, name: fileName };
      setVideo(videoFile);
      setStatusMessage('Video ready for upload');
      return videoFile;
    } catch (error) {
      console.error('Video processing error:', error);
      setStatusMessage('Failed to process video');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async () => {
    if (!image || !video) {
      setStatusMessage('Missing video or reference image');
      Alert.alert('Error', 'Both video and reference image are required');
      return;
    }

    setLoading(true);
    setStatusMessage('Preparing files for upload...');
    
    try {
      // Verify files exist and are valid
      const videoInfo = await FileSystem.getInfoAsync(video.uri);
      const imageInfo = await FileSystem.getInfoAsync(image.uri);
      
      if (!videoInfo.exists || !imageInfo.exists || videoInfo.size === 0 || imageInfo.size === 0) {
        throw new Error('One or both files are missing or empty');
      }

      setStatusMessage('Uploading files...');
      let formData = new FormData();
      formData.append('video', { uri: video.uri, type: video.type, name: video.name });
      formData.append('stump_img', { uri: image.uri, type: image.type, name: image.name });

      const response = await fetch('https://e9e8-120-56-194-121.ngrok-free.app/finalResult', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'image/jpeg',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      setStatusMessage('Processing response...');
      const fileUri = `${FileSystem.cacheDirectory}processed_image_${Date.now()}.jpg`;
      const imageBlob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setProcessedImage(fileUri);
        setModalVisible(true);
        setStatusMessage('Processing complete');
      };

      reader.readAsDataURL(imageBlob);
    } catch (error) {
      console.error('Upload error:', error);
      setStatusMessage(`Error: ${error.message}`);
      Alert.alert('Upload Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    setIsRecording(true);
    setStatusMessage('Recording...');
    
    try {
      const videoResult = await cameraRef.current.recordAsync({
        quality: '1080p',
        maxDuration: 60,
        ratio: '16:9',
      });
      
      setStatusMessage('Video recorded successfully');
      await cacheVideo(videoResult.uri);
    } catch (error) {
      console.error('Recording error:', error);
      setStatusMessage(`Recording failed: ${error.message}`);
      Alert.alert('Error', error.message);
    }
    
    setIsRecording(false);
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setStatusMessage('Processing recording...');
    }
  };

  const clearCache = async () => {
    setLoading(true);
    setStatusMessage('Clearing session data...');
    
    try {
      const cacheFiles = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
      for (const file of cacheFiles) {
        await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true });
      }
      setImage(null);
      setVideo(null);
      setProcessedImage(null);
      setModalVisible(false);
      setStatusMessage('Ready to record');
    } catch (error) {
      console.error('Cache clear error:', error);
      setStatusMessage(`Clear failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.statusText}>Initializing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={80} color="#3498db" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to record video for analysis.
            All recordings are stored securely on your device.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={[styles.camera, { width: screenWidth, height: screenWidth * (16/9) }]}
          facing="back"
          ref={cameraRef}
          mode="video"
        >
          {/* Camera UI Overlay */}
          <View style={styles.cameraOverlay}>
            {/* Status Bar */}
            <View style={styles.statusBar}>
              <Text style={styles.statusText}>{statusMessage}</Text>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
                </View>
              )}
            </View>
            
            {/* Viewfinder Guide (when recording) */}
            {isRecording && (
              <View style={styles.viewfinderGuide}>
                <View style={styles.viewfinderFrame} />
              </View>
            )}
            
            {/* Reference Image Thumbnail */}
            {image && !isRecording && !video && (
              <View style={styles.thumbnailContainer}>
                <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                <Text style={styles.thumbnailText}>Reference Image</Text>
              </View>
            )}
            
            {/* Recording Controls */}
            <View style={styles.controlsContainer}>
              {!video ? (
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    isRecording && styles.recordButtonActive
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <View style={styles.recordButtonInner}>
                    {isRecording && <View style={styles.recordButtonStop} />}
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.videoConfirmContainer}>
                  <Text style={styles.videoReadyText}>Video Ready</Text>
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={uploadMedia}
                    disabled={loading}
                  >
                    <Ionicons name="cloud-upload" size={24} color="white" />
                    <Text style={styles.uploadButtonText}>Process Video</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </CameraView>
      </View>
      
      {/* Video Preview */}
      {video && !isRecording && (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.mediaRow}>
            {/* Reference Image */}
            {image && (
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Reference</Text>
                <Image source={{ uri: image.uri }} style={styles.previewMedia} />
              </View>
            )}
            
            {/* Video Preview */}
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>Recording</Text>
              {Video ? (
                <Video
                  source={{ uri: video.uri }}
                  style={styles.previewMedia}
                  controls
                  resizeMode="contain"
                  shouldPlay={false}
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Ionicons name="videocam-off" size={32} color="#999" />
                </View>
              )}
            </View>
          </View>
        </View>
      )}
      
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>{statusMessage}</Text>
        </View>
      )}
      
      {/* Results Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Processing Complete</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <Image source={{ uri: processedImage }} style={styles.resultImage} />
          
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalButton} onPress={clearCache}>
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.modalButtonText}>Start Over</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]}>
              <Ionicons name="download" size={20} color="white" />
              <Text style={styles.modalButtonText}>Save Result</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#2c3e50',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#7f8c8d',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    width: '100%',
    height: 'auto',
    overflow: 'hidden',
  },
  camera: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff0000',
    marginRight: 8,
  },
  recordingTime: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewfinderGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderFrame: {
    width: '80%',
    height: '60%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
  },
  thumbnailContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 4,
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 4,
  },
  thumbnailText: {
    color: 'white',
    fontSize: 10,
    marginTop: 4,
  },
  controlsContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonStop: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
    borderRadius: 4,
  },
  videoConfirmContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  videoReadyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  previewSection: {
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  previewTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  previewLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  previewMedia: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 8,
    backgroundColor: '#2c2c2c',
  },
  previewPlaceholder: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 8,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultImage: {
    flex: 1,
    width: '100%',
    resizeMode: 'contain',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#555',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    flex: 1,
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#2ecc71',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});