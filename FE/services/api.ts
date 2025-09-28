// API Configuration and Service
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For Android Emulator use 10.0.2.2:3000, for iOS Simulator use localhost:3000
// For physical device, use your computer's IP address (replace with your actual IP)
const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000/api' 
  : Platform.OS === 'web'
  ? 'http://localhost:3000/api' // Use localhost for web platform
  : 'http://192.168.1.18:3000/api'; // Use network IP for iOS

export interface User {
  _id: string;
  name: string;
  email: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  interestedIn: 'male' | 'female' | 'both';
  role: 'user' | 'admin';
  bio: string;
  photos: Array<{
    _id: string;
    url: string;
    isMain: boolean;
    uploadedAt: string;
  }>;
  location: {
    type: string;
    coordinates: number[];
    city: string;
    country: string;
  };
  preferences: {
    ageRange: {
      min: number;
      max: number;
    };
    maxDistance: number;
  };
  isOnline: boolean;
  lastActive: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  interestedIn: 'male' | 'female' | 'both';
  role?: 'user' | 'admin';
  bio?: string;
  location?: {
    coordinates?: number[];
    city?: string;
    country?: string;
  };
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
  };
  errors?: any[];
}

class APIService {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    try {
      const token = await this.getAuthToken();
      
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      console.log(`Making request to: ${API_BASE_URL}${endpoint}`);
      console.log('Request config:', config);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        throw new Error('Server returned invalid response');
      }

      console.log('Response status:', response.status);
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Request Error (${endpoint}):`, error);
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.token) {
      await AsyncStorage.setItem('auth_token', response.data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
    }

    return response;
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data?.token) {
      await AsyncStorage.setItem('auth_token', response.data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.log('Logout API call failed, but continuing with local logout');
    } finally {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.makeRequest('/auth/me');
    return response.data.user;
  }

  async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    return await this.makeRequest('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async checkHealth(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  }
}

export const apiService = new APIService();