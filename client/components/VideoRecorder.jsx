import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Alert, Modal, Image, TouchableOpacity, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video } from 'expo-video';
import * as FileSystem from 'expo-file-system';

export default function VideoRecorder({ stump_image }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [video, setVideo] = useState(null);
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [debugStatus, setDebugStatus] = useState('');
  const cameraRef = useRef(null);

  const LOCAL_STORAGE_DIR = `${FileSystem.documentDirectory}VideoRecorder/`;

  useEffect(() => {
    (async () => {
      await FileSystem.makeDirectoryAsync(LOCAL_STORAGE_DIR, { intermediates: true });
      if (!permission || !permission.granted) {
        setDebugStatus('Requesting camera permissions...');
        await requestPermission();
      } else {
        setDebugStatus('Camera permissions granted');
      }
    })();
  }, [permission]);

  useEffect(() => {
    (async () => {
      if (stump_image && !image) {
        setDebugStatus('Caching stump image...');
        const fileType = 'image/jpeg';
        const fileName = `stump_${Date.now()}.jpg`;
        const tempUri = `${FileSystem.cacheDirectory}${fileName}`;
        const permanentUri = `${LOCAL_STORAGE_DIR}${fileName}`;

        try {
          await FileSystem.copyAsync({ from: stump_image, to: tempUri });
          const info = await FileSystem.getInfoAsync(tempUri);
          if (!info.exists || info.size === 0) throw new Error('Stump image invalid');

          await FileSystem.copyAsync({ from: tempUri, to: permanentUri });
          setImage({ uri: permanentUri, type: fileType, name: fileName });
          setDebugStatus(`Stump image saved: ${permanentUri} (${info.size} bytes)`);
          console.log('Stump image info:', info);
        } catch (error) {
          console.error('Stump caching error:', error);
          setDebugStatus(`Stump caching failed: ${error.message}`);
          Alert.alert('Error', 'Failed to cache stump image');
        }
      }
    })();
  }, [stump_image]);

  const cacheVideo = async (videoUri) => {
    setDebugStatus('Caching video...');
    const fileType = 'video/mp4';
    const fileName = `video_${Date.now()}.mp4`;
    const tempUri = `${FileSystem.cacheDirectory}${fileName}`;
    const permanentUri = `${LOCAL_STORAGE_DIR}${fileName}`;

    try {
      await FileSystem.copyAsync({ from: videoUri, to: tempUri });
      const info = await FileSystem.getInfoAsync(tempUri);
      if (!info.exists || info.size === 0) throw new Error('Video invalid');

      await FileSystem.copyAsync({ from: tempUri, to: permanentUri });
      const videoFile = { uri: permanentUri, type: fileType, name: fileName };
      setVideo(videoFile);
      setDebugStatus(`Video saved: ${permanentUri} (${info.size} bytes)`);
      console.log('Video info:', info);
      return videoFile;
    } catch (error) {
      console.error('Video caching error:', error);
      setDebugStatus(`Video caching failed: ${error.message}`);
      throw error;
    }
  };

  const saveFilesToBackend = async () => {
    if (!image || !video) {
      setDebugStatus('Missing video or stump image');
      Alert.alert('Error', 'Both video and stump image are required');
      return false;
    }

    setDebugStatus('Saving files to backend...');
    const formData = new FormData();
    formData.append('video', { uri: video.uri, type: video.type, name: video.name });
    formData.append('stump_img', { uri: image.uri, type: image.type, name: image.name });
    console.log('Sending to backend:', { video: video.name, stump_img: image.name });

    try {
      const response = await fetch('https://9f71-120-56-197-68.ngrok-free.app/save_files', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Save files error:', errorText);
        throw new Error(`Failed to save files: ${errorText}`);
      }

      const result = await response.json();
      console.log('Backend save result:', result);
      setDebugStatus('Files saved to backend successfully');
      Alert.alert('Save Success', `Files saved to backend:\nVideo: ${result.video_path}\nStump: ${result.stump_image_path}`);
      return true;
    } catch (error) {
      console.error('Save files error:', error);
      setDebugStatus(`Save failed: ${error.message}`);
      Alert.alert('Save Failed', error.message);
      return false;
    }
  };

  const uploadMedia = async () => {
    // Only save files to backend for testing
    await saveFilesToBackend();
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    setIsRecording(true);
    setDebugStatus('Recording video...');
    try {
      const videoResult = await cameraRef.current.recordAsync({
        quality: '1080p',
        maxDuration: 60,
        ratio: '16:9',
      });
      console.log('Raw video URI:', videoResult.uri);

      const cachedVideo = await cacheVideo(videoResult.uri);
      Alert.alert('Video Recorded', `Video saved at: ${cachedVideo.uri}`);
    } catch (error) {
      console.error('Recording error:', error);
      setDebugStatus(`Recording failed: ${error.message}`);
      Alert.alert('Error', error.message);
    }
    setIsRecording(false);
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setDebugStatus('Recording stopped');
    }
  };

  const clearCache = async () => {
    setDebugStatus('Clearing cache...');
    try {
      const cacheFiles = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
      for (const file of cacheFiles) {
        await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true });
      }
      setImage(null);
      setVideo(null);
      setProcessedImage(null);
      setModalVisible(false);
      setDebugStatus('Cache cleared (local storage preserved)');
    } catch (error) {
      console.error('Cache clear error:', error);
      setDebugStatus(`Cache clear failed: ${error.message}`);
    }
  };

  if (!permission) return <View style={styles.container}><Text>{debugStatus}</Text></View>;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>No access to camera</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
        <Text style={styles.infoText}>{debugStatus}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
        mode="video"
      />
      <View style={styles.buttonContainer}>
        <Button
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
          onPress={isRecording ? stopRecording : startRecording}
        />
      </View>

      {image && (
        <View style={styles.mediaContainer}>
          <Text style={styles.infoText}>Stump Image:</Text>
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
        </View>
      )}
      {video && (
        <View style={styles.mediaContainer}>
          <Text style={styles.infoText}>Recorded Video:</Text>
          {Video ? (
            <Video
              source={{ uri: video.uri }}
              style={styles.previewImage}
              controls
              resizeMode="contain"
              shouldPlay={false}
            />
          ) : (
            <Text style={styles.infoText}>Video unavailable: {video.uri}</Text>
          )}
          <TouchableOpacity style={styles.confirmButton} onPress={uploadMedia}>
            <Text style={styles.confirmText}>Confirm and Save</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.infoText}>{debugStatus}</Text>
      {processedImage && <Text style={styles.infoText}>Processed Image: {processedImage}</Text>}

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <Image source={{ uri: processedImage }} style={styles.fullScreenImage} />
          <TouchableOpacity style={styles.cancelButton} onPress={clearCache}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  camera: {
    width: '100%',
    aspectRatio: 9 / 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  mediaContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  previewImage: {
    width: 180,
    height: 320,
    borderRadius: 10,
    marginVertical: 5,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  confirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  cancelButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 5,
  },
  cancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});