import React, { useState } from 'react';
import { Button, Image, View, StyleSheet, Alert, Text, TouchableOpacity, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const UploadScreen = () => {
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const pickMedia = async (mediaType) => {
   let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 1, });


    if (!result.canceled) {
      const selectedFile = result.assets[0];
      const fileType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
      const fileName = `upload.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      const tempUri = `${FileSystem.cacheDirectory}${fileName}`;

      try {
        await FileSystem.copyAsync({ from: selectedFile.uri, to: tempUri });

        const mediaFile = { uri: tempUri, type: fileType, name: fileName };
        mediaType === 'image' ? setImage(mediaFile) : setVideo(mediaFile);
      } catch (error) {
        console.error(`Error saving ${mediaType} to temp:`, error);
      }
    }
  };

  const uploadMedia = async () => {
    if (!image || !video) {
      Alert.alert('Error', 'Please select both an image and a video');
      return;
    }

    let formData = new FormData();
    formData.append('video', { uri: video.uri, type: video.type, name: video.name });
    formData.append('stump_img', { uri: image.uri, type: image.type, name: image.name });

    try {
      let response = await fetch('https://3945-120-60-79-235.ngrok-free.app/finalResult', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'image/jpeg',
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // ✅ Save the returned image to cache
      const fileUri = `${FileSystem.cacheDirectory}processed_image.jpg`;
      const imageBlob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64data, { encoding: FileSystem.EncodingType.Base64 });
        setProcessedImage(fileUri);
        setModalVisible(true);
      };

      reader.readAsDataURL(imageBlob);
    } catch (error) {
      console.error("Upload Failed:", error);
      Alert.alert('Upload Failed', 'Something went wrong');
    }
  };

  const clearCache = async () => {
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
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
    
    // ✅ Reset all states
    setImage(null);
    setVideo(null);
    setProcessedImage(null);
    setModalVisible(false);
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

      {/* ✅ Full-screen Processed Image with Cancel Button */}
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
