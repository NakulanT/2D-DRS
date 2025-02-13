import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function App() {
  return (
    <View className="flex-1 justify-center items-center bg-slate-200">
      <Text className="text-5xl font-bold mb-6">
        Open up App.js to start working on your fun app!
      </Text>
      <StatusBar style="auto" />

      <View className="flex-row justify-around space-x-4 w-full px-8 items-center ">
        <Link href="/record" className="text-3xl font-bold underline text-blue-600 text-center">
          <View className="border-2 border-gray-400 rounded-lg p-6 flex-1 items-center justify-center">
            <MaterialIcons name="videocam" size={30} color="blue" />
            <Text className="text-2xl font-semibold mb-4 text-center">Record</Text>
          </View>
        </Link>

        <Link href="/profile" className="text-3xl font-bold underline text-blue-600 text-center">
          <View className="border-2 border-gray-400 rounded-lg p-6 flex-1 items-center justify-center">
            <MaterialIcons name="cloud-upload" size={30} color="blue" />
            <Text className="text-2xl font-semibold mb-4 text-center">Upload</Text>
          </View>
        </Link>
      </View>

      <View className="mt-8">
        <Link href="/auth" className="text-3xl font-bold underline text-blue-600 text-center">
          <View className="border-2 border-gray-400 rounded-lg p-6 flex-1 items-center justify-center">
            <MaterialIcons name="login" size={30} color="blue" />
            <Text className="text-2xl font-semibold mb-4 text-center">Authentication</Text>
          </View>
        </Link>
      </View>
    </View>
  );
}