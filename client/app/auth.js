import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google"; // ✅ Correct Import
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession(); // ✅ Prevents issues on Web

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // ✅ Fix: Google Auth Request with Android and Web Client IDs
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "692055383262-4j9osvfse1voq1v58igjivms0ql5uvsv.apps.googleusercontent.com", // Android Client ID
    webClientId: "692055383262-r0t5oab7muk0fee2lgk39a5tpgdilmm7.apps.googleusercontent.com", // Web Client ID
  });

  useEffect(() => {
    if (response?.type === "success") {
      console.log("Login Successful!", response.authentication);
    }
  }, [response]);

  return (
    <View className="flex-1 justify-center items-center bg-slate-200 px-6">
      <Text className="text-4xl font-bold mb-6">
        {isSignUp ? "Sign Up" : "Sign In"}
      </Text>

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

      {/* ✅ Google Sign-In Button */}
      <TouchableOpacity
        className="bg-red-500 p-4 rounded-lg w-full mb-4"
        onPress={() => promptAsync()} // ✅ Trigger Google Sign-In
      >
        <Text className="text-white text-center text-xl font-semibold">
          Sign in with Google
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text className="text-blue-600 text-lg">
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="mt-6" onPress={() => router.push("/")}>
        <Text className="text-gray-600 text-lg">Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}