# Tinder V2 Frontend

A React Native mobile application built with Expo for the Tinder V2 dating app. Features authentication, user profiles, and real-time messaging.

## 🚀 Features Implemented

### ✅ Authentication System
- **Login Screen** - Email/password authentication with validation
- **Registration Screen** - Complete user signup with profile details
- **Authentication Context** - Global state management for user sessions
- **Auto-redirect** - Automatic navigation based on authentication status
- **Form Validation** - Client-side validation with error messaging
- **Secure Storage** - JWT token and user data persistence

### ✅ User Interface
- **Home Dashboard** - Main screen showing user profile and activity
- **Profile Display** - User information with photo and bio
- **Navigation Flow** - Seamless routing between authentication and main screens
- **Loading States** - Activity indicators and loading management
- **Error Handling** - User-friendly error messages and alerts

### ✅ API Integration
- **HTTP Client** - Axios-based API service with token management
- **Authentication API** - Login/register endpoints
- **Profile Management** - User data fetching and updates
- **Platform Support** - Android/iOS API endpoint configuration

## 📱 Screens Overview

### Authentication Flow
1. **Index Screen** (`/app/index.tsx`) - Initial router that checks auth state
2. **Login Screen** (`/app/login.tsx`) - User login with email/password
3. **Register Screen** (`/app/register.tsx`) - New user registration form
4. **Home Screen** (`/app/home.tsx`) - Main dashboard after authentication

### Navigation Structure
```
app/
├── index.tsx          # Initial router screen
├── login.tsx          # Login form screen
├── register.tsx       # Registration form screen
├── home.tsx           # Main dashboard screen
└── _layout.tsx        # Root layout with providers
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16+)
- Expo CLI
- Android Studio / Xcode (for simulators)
- Backend server running on localhost:3000

### Quick Start

1. **Navigate to frontend directory:**
   ```bash
   cd FE
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npx expo start
   ```

4. **Run on device/simulator:**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

## 📦 Dependencies

### Core Packages
- **React Native** - Mobile app framework
- **Expo** - Development and build platform
- **Expo Router** - File-based navigation
- **TypeScript** - Type safety and development experience

### Authentication & Storage
- **@react-native-async-storage/async-storage** - Local data storage
- **axios** - HTTP client for API requests

### UI Components
- **@react-native-picker/picker** - Native picker component
- **react-native-vector-icons** - Icon library

### Navigation
- **@react-navigation/native** - Navigation core
- **@react-navigation/bottom-tabs** - Tab navigation
- **expo-router** - File-based routing

## 🏗️ Architecture

### Context Management
```typescript
// Global authentication state
AuthContext {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials) => Promise<AuthResponse>
  register: (userData) => Promise<AuthResponse>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}
```

### API Service
```typescript
// Centralized API communication
APIService {
  login(credentials)
  register(userData)
  logout()
  getCurrentUser()
  updateProfile(updates)
}
```

### Type Definitions
- **User Interface** - Complete user profile structure
- **Authentication Types** - Login/register data types
- **API Response Types** - Standardized response formats

## 🔐 Security Features

### Authentication
- JWT token storage in AsyncStorage
- Automatic token refresh on app launch
- Secure logout with token cleanup
- API request authentication headers

### Validation
- Email format validation
- Password strength requirements
- Age and required field validation
- Real-time form error feedback

### Data Protection
- Secure storage of sensitive data
- API endpoint configuration per platform
- Error handling without exposing internals

## 📱 Platform Configuration

### Android Setup
- API Base URL: `http://10.0.2.2:3000/api` (for emulator)
- Vector icons configured
- AsyncStorage permissions

### iOS Setup
- API Base URL: `http://localhost:3000/api` (for simulator)
- Required permissions in Info.plist
- Network security configuration

## 🎨 UI/UX Design

### Design System
- **Primary Color**: #e91e63 (Pink)
- **Background**: #f8f9fa (Light gray)
- **Text Colors**: #333 (dark), #666 (medium), #999 (light)
- **Border Radius**: 8-12px for modern look
- **Shadows**: Consistent elevation across components

### Component Structure
- Reusable form inputs with validation
- Consistent button styles and states
- Loading indicators and disabled states
- Responsive layout for different screen sizes

## 🔧 Development Scripts

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS  
npm run ios

# Run on web
npm run web

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler cache issues:**
   ```bash
   npx expo start --clear
   ```

2. **API connection fails:**
   - Ensure backend is running on localhost:3000
   - Check platform-specific API URL configuration
   - Verify network permissions

3. **Authentication redirects not working:**
   - Clear AsyncStorage: Developer menu → Delete AsyncStorage
   - Check AuthContext provider wrapping
   - Verify navigation structure

4. **TypeScript errors:**
   ```bash
   npx tsc --noEmit
   ```

5. **Package version conflicts:**
   ```bash
   npm install --legacy-peer-deps
   ```

## 📊 Current Status

### ✅ Completed Features
- Authentication screens (login/register)
- Home dashboard with user profile
- API integration with backend
- Navigation flow and routing
- Form validation and error handling
- JWT token management
- TypeScript implementation

### 🚧 Next Steps (Future Implementation)
- Discover/Swiping screen
- Matches screen
- Real-time messaging
- Photo upload functionality
- Location services
- Push notifications
- Profile editing
- Settings screen

## 🔗 API Integration

### Backend Connection
- **Base URL**: Configurable per platform
- **Authentication**: JWT Bearer tokens
- **Endpoints**: 
  - POST /auth/login
  - POST /auth/register
  - POST /auth/logout
  - GET /auth/me
  - PUT /auth/update-profile

### Response Handling
- Standardized success/error responses
- Automatic token refresh
- Network error handling
- Loading state management

## 📝 Usage Examples

### Authentication Flow
```typescript
// Login user
const { login } = useAuth();
const result = await login({
  email: 'user@example.com',
  password: 'password123'
});

// Register new user
const { register } = useAuth();
const result = await register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  age: 25,
  gender: 'male',
  interestedIn: 'female'
});
```

### Navigation
```typescript
// Programmatic navigation
import { router } from 'expo-router';

router.push('/login');
router.replace('/home');
```

## 🎯 Performance Considerations

- AsyncStorage for offline capability
- Optimized re-renders with React Context
- Image caching for profile photos
- Lazy loading for better startup times
- Platform-specific optimizations

---

**Status**: ✅ **Frontend Successfully Created and Ready for Testing**

**Next Steps**: 
1. Start the Expo development server: `npx expo start`
2. Test authentication flow with backend API
3. Implement additional features (discover, matches, messaging)

The frontend is now fully integrated with your backend API and ready for development and testing!