import { StatusBar } from 'expo-status-bar';
import { Text, View, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function App() {
  return (
    <View className="flex-1 justify-center items-center bg-slate-100 px-4">
      <Text className="text-5xl font-bold mb-8 text-center text-gray-900">DRS!!</Text>
      <StatusBar style="auto" />

      <View className="w-full max-w-md space-y-6">
        <Link href="/CameraScreen" asChild>
          <TouchableOpacity className="border-2 border-gray-400 rounded-xl p-6 flex-row items-center justify-center bg-white shadow-lg">
            <MaterialIcons name="videocam" size={30} color="blue" />
            <Text className="text-2xl font-semibold ml-4 text-gray-900">Record</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/upload" asChild>
          <TouchableOpacity className="border-2 border-gray-400 rounded-xl p-6 flex-row items-center justify-center bg-white shadow-lg">
            <MaterialIcons name="cloud-upload" size={30} color="blue" />
            <Text className="text-2xl font-semibold ml-4 text-gray-900">Upload</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View className="mt-8 w-full max-w-md">
        <Link href="/auth" asChild>
          <TouchableOpacity className="border-2 border-gray-400 rounded-xl p-6 flex-row items-center justify-center bg-white shadow-lg">
            <MaterialIcons name="login" size={30} color="blue" />
            <Text className="text-2xl font-semibold ml-4 text-gray-900">Authentication</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}