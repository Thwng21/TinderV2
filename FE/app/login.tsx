import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, error, clearError } = useAuth();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.success) {
        Alert.alert(
          'Đăng nhập thành công!',
          'Chào mừng bạn trở lại Tinder V2!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Redirect will be handled automatically by AuthContext
                router.replace('/');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Đăng nhập thất bại',
          response.message || 'Email hoặc mật khẩu không đúng',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'Lỗi',
        error.message || 'Có lỗi không mong muốn xảy ra',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    router.push('/register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Tinder V2</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục hành trình của bạn</Text>
          </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="Nhập địa chỉ email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={password}
              onChangeText={setPassword}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={navigateToRegister} disabled={isLoading}>
              <Text style={styles.registerLink}>Đăng ký</Text>
            </TouchableOpacity>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPasswordContainer} disabled={isLoading}>
            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Math.max(20, width * 0.05),
    paddingVertical: Math.max(20, height * 0.03),
  },
  header: {
    alignItems: 'center',
    marginBottom: Math.max(30, height * 0.05),
    paddingTop: Math.max(20, height * 0.03),
  },
  title: {
    fontSize: Math.max(24, width * 0.07),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.max(14, width * 0.04),
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: Math.max(20, width * 0.05),
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: Math.max(16, height * 0.025),
  },
  label: {
    fontSize: Math.max(14, width * 0.04),
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: Math.max(12, width * 0.03),
    fontSize: Math.max(14, width * 0.04),
    backgroundColor: '#f9f9f9',
    minHeight: Math.max(44, height * 0.06),
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: Math.max(12, width * 0.03),
    marginTop: 4,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: '#e91e63',
    borderRadius: 12,
    padding: Math.max(14, height * 0.02),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Math.max(20, height * 0.03),
    marginBottom: Math.max(10, height * 0.015),
    minHeight: Math.max(50, height * 0.065),
    shadowColor: '#e91e63',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: Math.max(16, width * 0.045),
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Math.max(20, height * 0.03),
  },
  registerText: {
    fontSize: Math.max(14, width * 0.04),
    color: '#666',
  },
  registerLink: {
    fontSize: Math.max(14, width * 0.04),
    color: '#e91e63',
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#e91e63',
    fontWeight: '500',
  },
});