import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated } from 'react-native';
import { useTailwind } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

const SignInScreen = () => {
  const tailwind = useTailwind();
  const fadeAnim = new Animated.Value(0);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <LinearGradient
      colors={['#6EE7B7', '#3B82F6']} // Gradient background
      style={tailwind('flex-1 justify-center p-6')}
    >
      <Animated.View
        style={[
          tailwind('bg-white p-8 rounded-xl shadow-2xl'),
          { opacity: fadeAnim },
        ]}
      >
        <Text style={tailwind('text-3xl font-bold text-center mb-6 text-gray-800')}>
          Welcome Back!
        </Text>

        {/* Email Input */}
        <TextInput
          placeholder="Email"
          style={tailwind(
            'bg-gray-100 p-4 rounded-lg mb-4 text-gray-800 placeholder-gray-500'
          )}
          placeholderTextColor="#888"
        />

        {/* Password Input */}
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={tailwind(
            'bg-gray-100 p-4 rounded-lg mb-6 text-gray-800 placeholder-gray-500'
          )}
          placeholderTextColor="#888"
        />

        {/* Sign In Button */}
        <TouchableOpacity
          style={tailwind('bg-blue-500 p-4 rounded-lg items-center')}
        >
          <Text style={tailwind('text-white font-bold text-lg')}>Sign In</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={tailwind('flex-row items-center my-6')}>
          <View style={tailwind('flex-1 h-px bg-gray-300')} />
          <Text style={tailwind('mx-4 text-gray-500')}>OR</Text>
          <View style={tailwind('flex-1 h-px bg-gray-300')} />
        </View>

        {/* Social Login Buttons */}
        <TouchableOpacity
          style={tailwind(
            'flex-row bg-red-500 p-4 rounded-lg items-center justify-center mb-4'
          )}
        >
          <Text style={tailwind('text-white font-bold text-lg')}>
            Sign In with Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tailwind(
            'flex-row bg-blue-600 p-4 rounded-lg items-center justify-center'
          )}
        >
          <Text style={tailwind('text-white font-bold text-lg')}>
            Sign In with Facebook
          </Text>
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View style={tailwind('mt-6 flex-row justify-center')}>
          <Text style={tailwind('text-gray-600')}>Don't have an account? </Text>
          <TouchableOpacity>
            <Text style={tailwind('text-blue-500 font-bold')}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

export default SignInScreen;