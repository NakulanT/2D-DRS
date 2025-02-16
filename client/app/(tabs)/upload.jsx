// let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsEditing: true, aspect: [4, 3], quality: 1, });

import React, { useState } from 'react';
import { Button, Image, View, StyleSheet, Alert, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const upload = () => {
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);

  const pickMedia = async (mediaType) => {
   let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 1, });


    if (!result.canceled) {
      const selectedFile = result.assets[0];
      const fileType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
      const fileName = `upload.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      const tempUri = `${FileSystem.cacheDirectory}${fileName}`;

      try {
        // Move file to temp directory
        await FileSystem.copyAsync({
          from: selectedFile.uri,
          to: tempUri,
        });

        const mediaFile = {
          uri: tempUri,
          type: fileType,
          name: fileName,
        };

        if (mediaType === 'image') {
          setImage(mediaFile);
        } else {
          setVideo(mediaFile);
        }

        console.log(`Saved ${mediaType} to temp:`, tempUri);
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
    formData.append('video', {
      uri: video.uri,
      type: video.type || 'video/mp4',
      name: video.name || 'video.mp4',
    });
  
    formData.append('stump_img', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.name || 'image.jpg',
    });
  
    console.log("FormData Debugging:");
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
  
    try {
      let response = await fetch('https://19e3-120-60-70-60.ngrok-free.app/finalResult', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
  
      console.log("Response:", response);
      let json = await response.json();
      Alert.alert('Upload Successful', 'Response: ' + JSON.stringify(json));
  
      // Clear cache after successful upload
      await FileSystem.deleteAsync(image.uri, { idempotent: true });
      await FileSystem.deleteAsync(video.uri, { idempotent: true });
  
      // Reset state
      setImage(null);
      setVideo(null);
  
      console.log("Cache cleared successfully.");
    } catch (error) {
      console.error("Upload Failed:", error);
      Alert.alert('Upload Failed', 'Something went wrong');
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
});

export default upload;
