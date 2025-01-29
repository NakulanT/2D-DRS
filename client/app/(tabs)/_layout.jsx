import { View, Text } from 'react-native';
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TabIcon = ({ name, color, size }) => {
  return <Ionicons name={name} size={size} color={color} />;
};

const TabLayout = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#200', height: 60, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 12 },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tabs.Screen
        name="model"
        options={{
          title: 'model',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'record',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
