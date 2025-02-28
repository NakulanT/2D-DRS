import React, { useState } from 'react';
import { Button, Image, View, StyleSheet, Alert, Text, TouchableOpacity, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const UploadScreen = () => {
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [debugStatus, setDebugStatus] = useState(''); // Added debugStatus

  const pickMedia = async (mediaType) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
    });

    if (!result.canceled) {
      const selectedFile = result.assets[0];
      const fileType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
      const fileName = `upload.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      const tempUri = `${FileSystem.cacheDirectory}${fileName}`;

      try {
        await FileSystem.copyAsync({ from: selectedFile.uri, to: tempUri });
        const mediaFile = { uri: tempUri, type: fileType, name: fileName };
        mediaType === 'image' ? setImage(mediaFile) : setVideo(mediaFile);
        setDebugStatus(`${mediaType} cached: ${tempUri}`);
      } catch (error) {
        console.error(`Error saving ${mediaType} to temp:`, error);
        setDebugStatus(`Failed to cache ${mediaType}: ${error.message}`);
      }
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

    setDebugStatus('Uploading files...');
    let formData = new FormData();
    formData.append('video', { uri: video.uri, type: video.type, name: video.name });
    formData.append('stump_img', { uri: image.uri, type: image.type, name: image.name });
    console.log("formData", formData);

    try {
      console.log('Upload details:', { video: video.uri, stump_img: image.uri });
      const response = await fetch('https://5976-120-56-194-121.ngrok-free.app/finalResult', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'image/jpeg',
          // 'Content-Type': 'multipart/form-data' //is set automatically by FormData
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
      }

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
    } catch (error) {
      console.error('Upload error:', error);
      setDebugStatus(`Upload failed: ${error.message}`);
      Alert.alert('Upload Failed', error.message);
    }
  };

  const clearCache = async () => {
    setDebugStatus('Clearing cache...');
    try {
      if (processedImage) {
        await FileSystem.deleteAsync(processedImage, { idempotent: true });
      }
      if (image) {
        await FileSystem.deleteAsync(image.uri, { idempotent: true });
      }
      if (video) {
        await FileSystem.deleteAsync(video.uri, { idempotent: true });
      }
      setImage(null);
      setVideo(null);
      setProcessedImage(null);
      setModalVisible(false);
      setDebugStatus('Cache cleared');
    } catch (error) {
      console.error("Error clearing cache:", error);
      setDebugStatus(`Cache clear failed: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick an Image" onPress={() => pickMedia('image')} />
      {image && (
        <>
          <Text style={styles.text}>Selected Image Preview:</Text>
          <Image source={{ uri: image.uri }} style={styles.media} />
        </>
      )}

      <Button title="Pick a Video" onPress={() => pickMedia('video')} />
      {video && <Text style={styles.text}>Video Selected</Text>}

      <Button title="Upload to Backend" onPress={uploadMedia} />
      <Text style={styles.debugText}>{debugStatus}</Text> {/* Added debug status display */}

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <Image source={{ uri: processedImage }} style={styles.fullScreenImage} />
          <TouchableOpacity style={styles.cancelButton} onPress={clearCache}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  media: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: 'black',
  },
  debugText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
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

export default UploadScreen;