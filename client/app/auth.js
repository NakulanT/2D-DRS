import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  return (
    <View className="flex-1 justify-center items-center bg-slate-200 px-6">
      <Text className="text-4xl font-bold mb-6">{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
      
      <TextInput
        className="border-2 border-gray-400 rounded-lg p-3 w-full mb-4 bg-white"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        className="border-2 border-gray-400 rounded-lg p-3 w-full mb-4 bg-white"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity className="bg-blue-600 p-4 rounded-lg w-full mb-4" onPress={() => console.log(isSignUp ? 'Signing Up' : 'Signing In')}>
        <Text className="text-white text-center text-xl font-semibold">{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text className="text-blue-600 text-lg">
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity className="mt-6" onPress={() => router.push('/')}>  
        <Text className="text-gray-600 text-lg">Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}
