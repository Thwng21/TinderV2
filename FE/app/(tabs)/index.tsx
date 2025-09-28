import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Check user role and redirect accordingly
        if (user.role === 'admin') {
          console.log('Admin user detected, redirecting to admin panel');
          router.replace('/admin/homeAdmin');
        } else {
          console.log('Regular user detected, redirecting to user home');
          router.replace('/user/home');
        }
      } else {
        // User is not authenticated, go to login
        console.log('User not authenticated, redirecting to login');
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, user]);

  // Show loading screen while checking authentication
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#e91e63" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
