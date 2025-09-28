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
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { RegisterData } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: 'male' as 'male' | 'female' | 'other',
    interestedIn: 'both' as 'male' | 'female' | 'both',
    bio: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showInterestedPicker, setShowInterestedPicker] = useState(false);

  const { register, error, clearError } = useAuth();

  const genderOptions = [
    { label: 'Nam', value: 'male' },
    { label: 'Nữ', value: 'female' },
    { label: 'Khác', value: 'other' },
  ];

  const interestedOptions = [
    { label: 'Nam', value: 'male' },
    { label: 'Nữ', value: 'female' },
    { label: 'Tất cả', value: 'both' },
  ];

  const getGenderLabel = (value: string) => {
    return genderOptions.find(option => option.value === value)?.label || '';
  };

  const getInterestedLabel = (value: string) => {
    return interestedOptions.find(option => option.value === value)?.label || '';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên là bắt buộc';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Tên phải có ít nhất 2 ký tự';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }

    const age = parseInt(formData.age);
    if (!formData.age) {
      newErrors.age = 'Tuổi là bắt buộc';
    } else if (isNaN(age) || age < 18 || age > 100) {
      newErrors.age = 'Tuổi phải từ 18 đến 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const registerData: RegisterData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        age: parseInt(formData.age),
        gender: formData.gender,
        interestedIn: formData.interestedIn,
        bio: formData.bio.trim() || undefined,
        location: {
          city: 'Ho Chi Minh City',
          country: 'Vietnam',
          coordinates: [106.6297, 10.8231]
        }
      };

      console.log('Registering user with data:', registerData);
      const response = await register(registerData);

      if (response.success) {
        Alert.alert(
          'Đăng ký thành công!',
          'Chào mừng bạn đến với Tinder V2! Tài khoản của bạn đã được tạo.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        const errorMessage = response.message || 'Có lỗi xảy ra khi đăng ký';
        Alert.alert(
          'Đăng ký thất bại',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'Có lỗi không mong muốn xảy ra';
      Alert.alert(
        'Lỗi',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.push('/login');
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: { label: string; value: string }[],
    selectedValue: string,
    onValueChange: (value: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalOverlayTouch} 
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  selectedValue === option.value && styles.selectedOption
                ]}
                onPress={() => {
                  onValueChange(option.value);
                  onClose();
                }}
              >
                <Text style={[
                  styles.optionText,
                  selectedValue === option.value && styles.selectedOptionText
                ]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Tham gia Tinder V2 và tìm kiếm nửa kia của bạn</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder="Nhập họ và tên của bạn"
                placeholderTextColor="#999"
                autoCapitalize="words"
                editable={!isLoading}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder="Nhập địa chỉ email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tuổi</Text>
              <TextInput
                style={[styles.input, errors.age && styles.inputError]}
                value={formData.age}
                onChangeText={(value) => updateFormData('age', value)}
                placeholder="Nhập tuổi của bạn"
                placeholderTextColor="#999"
                keyboardType="numeric"
                editable={!isLoading}
              />
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Giới tính</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowGenderPicker(true)}
                disabled={isLoading}
              >
                <Text style={[styles.pickerButtonText, formData.gender && styles.pickerButtonTextSelected]}>
                  {getGenderLabel(formData.gender) || 'Chọn giới tính'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Quan tâm đến</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowInterestedPicker(true)}
                disabled={isLoading}
              >
                <Text style={[styles.pickerButtonText, formData.interestedIn && styles.pickerButtonTextSelected]}>
                  {getInterestedLabel(formData.interestedIn) || 'Chọn sở thích'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Giới thiệu (Tùy chọn)</Text>
              <TextInput
                style={[styles.input, styles.bioInput, errors.bio && styles.inputError]}
                value={formData.bio}
                onChangeText={(value) => updateFormData('bio', value)}
                placeholder="Hãy giới thiệu về bản thân..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mật khẩu</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                placeholder="Xác nhận mật khẩu"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Đăng ký</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Gender Picker Modal */}
      {renderPickerModal(
        showGenderPicker,
        () => setShowGenderPicker(false),
        'Chọn giới tính',
        genderOptions,
        formData.gender,
        (value) => updateFormData('gender', value)
      )}

      {/* Interested In Picker Modal */}
      {renderPickerModal(
        showInterestedPicker,
        () => setShowInterestedPicker(false),
        'Quan tâm đến',
        interestedOptions,
        formData.interestedIn,
        (value) => updateFormData('interestedIn', value)
      )}
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
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.02,
    minHeight: height * 0.9,
  },
  header: {
    alignItems: 'center',
    marginBottom: height * 0.03,
    paddingTop: height * 0.015,
  },
  title: {
    fontSize: width * 0.06,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: width * 0.035,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: width * 0.05,
    lineHeight: width * 0.05,
  },
  form: {
    width: '100%',
    flexShrink: 1,
  },
  inputContainer: {
    marginBottom: height * 0.015,
  },
  label: {
    fontSize: width * 0.035,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: width * 0.03,
    fontSize: width * 0.035,
    backgroundColor: '#f9f9f9',
    minHeight: height * 0.05,
  },
  bioInput: {
    minHeight: height * 0.1,
    paddingTop: 10,
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: width * 0.03,
    marginTop: 4,
    marginLeft: 4,
  },
  // New styles for custom picker button
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: width * 0.03,
    backgroundColor: '#f9f9f9',
    minHeight: height * 0.05,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: width * 0.035,
    color: '#999',
  },
  pickerButtonTextSelected: {
    color: '#333',
  },
  pickerArrow: {
    fontSize: width * 0.03,
    color: '#666',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouch: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: width * 0.045,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  modalCloseText: {
    fontSize: width * 0.04,
    color: '#e91e63',
    fontWeight: '600',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginVertical: 2,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  selectedOption: {
    backgroundColor: '#e91e63',
  },
  optionText: {
    fontSize: width * 0.04,
    color: '#333',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  checkMark: {
    fontSize: width * 0.045,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Old picker styles (kept for backward compatibility)
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: height * 0.06,
    fontSize: width * 0.035,
  },
  registerButton: {
    backgroundColor: '#e91e63',
    borderRadius: 10,
    padding: height * 0.015,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.02,
    marginBottom: height * 0.01,
    minHeight: height * 0.06,
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: height * 0.02,
  },
  loginText: {
    fontSize: width * 0.035,
    color: '#666',
  },
  loginLink: {
    fontSize: width * 0.035,
    color: '#e91e63',
    fontWeight: '600',
  },
});