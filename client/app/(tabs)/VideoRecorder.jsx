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

  useEffect(() => {
    (async () => {
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

        try {
          await FileSystem.copyAsync({ from: stump_image, to: tempUri });
          const info = await FileSystem.getInfoAsync(tempUri);
          console.log('Stump image info:', info);
          if (!info.exists || info.size === 0) throw new Error('Stump image invalid');
          setImage({ uri: tempUri, type: fileType, name: fileName });
          setDebugStatus(`Stump image cached: ${tempUri} (${info.size} bytes)`);
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

    try {
      await FileSystem.copyAsync({ from: videoUri, to: tempUri });
      const info = await FileSystem.getInfoAsync(tempUri);
      console.log('Video info:', info);
      if (!info.exists || info.size === 0) throw new Error('Video invalid');
      const videoFile = { uri: tempUri, type: fileType, name: fileName };
      setVideo(videoFile);
      setDebugStatus(`Video cached: ${tempUri} (${info.size} bytes). Confirm to upload.`);
      return videoFile;
    } catch (error) {
      console.error('Video caching error:', error);
      setDebugStatus(`Video caching failed: ${error.message}`);
      throw error;
    }
  };

  const uploadMedia = async () => {
    if (!image || !video) {
      setDebugStatus('Missing video or stump image');
      Alert.alert('Error', 'Both video and stump image are required');
      return;
    }

    setDebugStatus('Verifying files...');
    const videoInfo = await FileSystem.getInfoAsync(video.uri);
    const imageInfo = await FileSystem.getInfoAsync(image.uri);
    console.log('Pre-upload check:', { video: videoInfo, image: imageInfo });
    if (!videoInfo.exists || !imageInfo.exists || videoInfo.size === 0 || imageInfo.size === 0) {
      setDebugStatus('Invalid files detected');
      Alert.alert('Error', 'One or both files are missing or empty');
      return;
    }

    const attemptUpload = async (videoFile, stumpFile) => {
      setDebugStatus('Uploading files...');
      let formData = new FormData();
      formData.append('video', videoFile);
      formData.append('stump_img', stumpFile);
      console.log("FormData contents:", {
        video: { uri: videoFile.uri, type: videoFile.type, name: videoFile.name },
        stump_img: { uri: stumpFile.uri, type: stumpFile.type, name: stumpFile.name }
      });

      const response = await fetch('https://f7e3-120-60-60-243.ngrok-free.app/finalResult', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'image/jpeg',
        },
      });

      return { ok: response.ok, response, errorText: response.ok ? null : await response.text() };
    };

    const processResponse = async (response) => {
      setDebugStatus('Processing response...');
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
        setDebugStatus(`Processed image saved: ${fileUri}`);
      };

      reader.readAsDataURL(imageBlob);
      Alert.alert('Upload Success', 'Files uploaded successfully!');
    };

    try {
      // Initial attempt with video and stump image
      const initialResult = await attemptUpload(
        { uri: video.uri, type: video.type, name: video.name },
        { uri: image.uri, type: image.type, name: image.name }
      );

      if (initialResult.ok) {
        await processResponse(initialResult.response);
      } else {
        console.log('Initial upload failed:', initialResult.errorText);
        // Retry if error involves addWeighted or empty frame
        if (initialResult.errorText.includes('addWeighted') || initialResult.errorText.includes('arithm.cpp') || initialResult.errorText.includes('Assertion failed')) {
          setDebugStatus('Retrying with stump image as video fallback...');
          const retryResult = await attemptUpload(
            { uri: image.uri, type: 'video/mp4', name: `video_fallback_${Date.now()}.mp4` }, // Ensure .mp4 extension
            { uri: image.uri, type: image.type, name: image.name }
          );

          if (retryResult.ok) {
            await processResponse(retryResult.response);
          } else {
            throw new Error(`Retry failed! Details: ${retryResult.errorText}`);
          }
        } else {
          throw new Error(`HTTP error! Details: ${initialResult.errorText}`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setDebugStatus(`Upload failed: ${error.message}`);
      Alert.alert('Upload Failed', error.message);
    }
  };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      setDebugStatus('Recording video...');
      try {
        const videoResult = await cameraRef.current.recordAsync({
          quality: '720p',
          maxDuration: 60,
          ratio: '4:3',
        });
        console.log('Raw video URI:', videoResult.uri);

        const cachedVideo = await cacheVideo(videoResult.uri);
        Alert.alert('Video Recorded', `Video cached at: ${cachedVideo.uri}`);
      } catch (error) {
        console.error('Recording error:', error);
        setDebugStatus(`Recording failed: ${error.message}`);
        Alert.alert('Error', error.message);
      }
      setIsRecording(false);
    }
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
      if (processedImage) await FileSystem.deleteAsync(processedImage, { idempotent: true });
      if (image) await FileSystem.deleteAsync(image.uri, { idempotent: true });
      if (video) await FileSystem.deleteAsync(video.uri, { idempotent: true });
      setImage(null);
      setVideo(null);
      setProcessedImage(null);
      setModalVisible(false);
      setDebugStatus('Cache cleared');
    } catch (error) {
      console.error('Cache clear error:', error);
      setDebugStatus(`Cache clear failed: ${error.message}`);
    }
  };

  if (!permission) {
    return <View style={styles.container}><Text>{debugStatus}</Text></View>;
  }
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
            <Text style={styles.infoText}>Video component unavailable. URI: {video.uri}</Text>
          )}
          <TouchableOpacity style={styles.confirmButton} onPress={uploadMedia}>
            <Text style={styles.confirmText}>Confirm and Upload</Text>
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
    aspectRatio: 4 / 3,
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
    width: 240,
    height: 180,
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