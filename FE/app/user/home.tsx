import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  StatusBar,
  PanResponder,
  Animated,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Mock data with more diverse profiles
const mockProfiles = [
  {
    id: 1,
    name: 'Anna',
    age: 25,
    distance: '2 km',
    bio: 'Love traveling and coffee ☕ Always up for new adventures!',
    image: null,
    verified: true,
    interests: ['Travel', 'Coffee', 'Photography'],
  },
  {
    id: 2,
    name: 'Maria',
    age: 23,
    distance: '5 km',
    bio: 'Photographer & Dog lover Weekend hiker and nature enthusiast',
    image: null,
    verified: false,
    interests: ['Photography', 'Dogs', 'Hiking'],
  },
  {
    id: 3,
    name: 'Sophie',
    age: 27,
    distance: '8 km',
    bio: 'Yoga instructor Mindfulness and healthy living',
    image: null,
    verified: true,
    interests: ['Yoga', 'Meditation', 'Health'],
  },
  {
    id: 4,
    name: 'Emma',
    age: 24,
    distance: '3 km',
    bio: 'Artist and bookworm Looking for meaningful conversations',
    image: null,
    verified: false,
    interests: ['Art', 'Books', 'Movies'],
  },
];

export default function UserHomeScreen() {
  const { user, logout } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('discover');
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [pan] = useState(new Animated.ValueXY());
  const [cardOpacity] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 20;
    },
    onPanResponderMove: (evt, gestureState) => {
      pan.setValue({ x: gestureState.dx, y: 0 });
      const opacity = Math.max(0.3, 1 - Math.abs(gestureState.dx) / width);
      cardOpacity.setValue(opacity);
    },
    onPanResponderRelease: (evt, gestureState) => {
      const swipeThreshold = width * 0.25;
      
      if (gestureState.dx > swipeThreshold) {
        // Swipe right - Like
        swipeRight();
      } else if (gestureState.dx < -swipeThreshold) {
        // Swipe left - Pass
        swipeLeft();
      } else {
        // Return to center
        Animated.parallel([
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
          Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: false })
        ]).start();
      }
    },
  });

  const swipeLeft = () => {
    Animated.timing(pan, {
      toValue: { x: -width, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      nextProfile();
    });
  };

  const swipeRight = () => {
    Animated.timing(pan, {
      toValue: { x: width, y: 0 },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      handleLike();
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ],
    );
  };

  const handleLike = () => {
    setLikeCount(prev => prev + 1);
    if (Math.random() > 0.7) { // 30% chance of match
      setMatchCount(prev => prev + 1);
      Alert.alert('🎉 It\'s a Match!', 'Bạn và ' + mockProfiles[currentProfileIndex].name + ' đã match!');
    }
    nextProfile();
  };

  const handlePass = () => {
    swipeLeft();
  };

  const nextProfile = () => {
    // Reset card position and opacity
    pan.setValue({ x: 0, y: 0 });
    cardOpacity.setValue(1);
    
    if (currentProfileIndex < mockProfiles.length - 1) {
      setCurrentProfileIndex(currentProfileIndex + 1);
    } else {
      setCurrentProfileIndex(0);
    }
  };

  interface Profile {
    id: number;
    name: string;
    age: number;
    distance: string;
    bio: string;
    image: string | null;
    verified: boolean;
    interests: string[];
  }

  interface InterestsProps {
    interests: string[];
  }

  const renderInterests = (interests: InterestsProps['interests']) => (
    <View style={styles.interestsContainer}>
      {interests.map((interest: string, index: number) => (
        <View key={index} style={styles.interestTag}>
          <Text style={styles.interestText}>{interest}</Text>
        </View>
      ))}
    </View>
  );

  const renderProfileCard = () => {
    if (mockProfiles.length === 0) return null;
    
    const profile = mockProfiles[currentProfileIndex];
    
    const rotateZ = pan.x.interpolate({
      inputRange: [-width / 2, 0, width / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.cardContainer}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.profileCard,
            {
              transform: [
                { translateX: pan.x },
                { rotateZ: rotateZ },
              ],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* Swipe indicators */}
          <Animated.View style={[
            styles.swipeIndicator,
            styles.likeIndicator,
            {
              opacity: pan.x.interpolate({
                inputRange: [0, width * 0.25],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              })
            }
          ]}>
            <Text style={styles.likeIndicatorText}>LIKE</Text>
          </Animated.View>
          
          <Animated.View style={[
            styles.swipeIndicator,
            styles.passIndicator,
            {
              opacity: pan.x.interpolate({
                inputRange: [-width * 0.25, 0],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              })
            }
          ]}>
            <Text style={styles.passIndicatorText}>PASS</Text>
          </Animated.View>

          {/* Profile Image with gradient overlay */}
          <View style={styles.imageContainer}>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                {profile.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.gradientOverlay} />
            
            {profile.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
            
            {/* Profile info overlay */}
            <View style={styles.profileInfoOverlay}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>
                  {profile.name}, {profile.age}
                </Text>
                <View style={styles.distanceContainer}>
                  <Ionicons name="location" size={14} color="#666" />
                  <Text style={styles.distance}>{profile.distance}</Text>
                </View>
              </View>
              <Text style={styles.profileBio}>{profile.bio}</Text>
              {renderInterests(profile.interests)}
            </View>
          </View>
        </Animated.View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.passButton} 
            onPress={handlePass}
            activeOpacity={0.8}
          >
            <MaterialIcons name="close" size={28} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.superLikeButton} 
            onPress={() => Alert.alert('Super Like', 'Super Like gửi đi!')}
            activeOpacity={0.8}
          >
            <AntDesign name="star" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.likeButton} 
            onPress={() => swipeRight()}
            activeOpacity={0.8}
          >
            <AntDesign name="heart" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'discover':
        return (
          <View style={styles.discoverTab}>
            {renderProfileCard()}
          </View>
        );
      case 'matches':
        return (
          <View style={styles.emptyTab}>
            <FontAwesome5 name="heart" size={50} color="#ddd" />
            <Text style={styles.emptyText}>Bạn có {matchCount} matches</Text>
            <Text style={styles.emptySubText}>
              {matchCount === 0 
                ? 'Hãy tiếp tục khám phá để tìm kiếm!' 
                : 'Nhấn vào match để bắt đầu trò chuyện!'
              }
            </Text>
          </View>
        );
      case 'messages':
        return (
          <View style={styles.emptyTab}>
            <Ionicons name="chatbubble-outline" size={50} color="#ddd" />
            <Text style={styles.emptyText}>Chưa có tin nhắn</Text>
            <Text style={styles.emptySubText}>Khi có match, bạn có thể bắt đầu trò chuyện!</Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e91e63" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#e91e63" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => Alert.alert('Profile', 'Tính năng sắp ra mắt!')}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>tinder</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleLogout}
        >
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar - only show in discover tab */}
      {activeTab === 'discover' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên, sở thích..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Khám phá
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.activeTab]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.activeTabText]}>
            Matches {matchCount > 0 && `(${matchCount})`}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Tin nhắn
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Bottom Stats - only show in discover tab */}
      {activeTab === 'discover' && (
        <View style={styles.bottomStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{likeCount}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Super Likes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{matchCount}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e91e63',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerButton: {
    width: 40,
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  logoutIcon: {
    fontSize: 18,
    color: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearIcon: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#e91e63',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#e91e63',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  discoverTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: width * 0.92,
    alignItems: 'center',
  },
  profileCard: {
    width: '100%',
    height: height * 0.65,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#e91e63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 100,
    color: '#fff',
    fontWeight: 'bold',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    
  },
  verifiedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  distance: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  profileBio: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  interestText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  swipeIndicator: {
    position: 'absolute',
    top: '40%',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 4,
    borderRadius: 8,
    zIndex: 1000,
  },
  likeIndicator: {
    right: 40,
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    transform: [{ rotate: '-20deg' }],
  },
  likeIndicatorText: {
    color: '#4CAF50',
    fontSize: 32,
    fontWeight: 'bold',
  },
  passIndicator: {
    left: 40,
    borderColor: '#f44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    transform: [{ rotate: '20deg' }],
  },
  passIndicatorText: {
    color: '#f44336',
    fontSize: 32,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  passButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passButtonText: {
    fontSize: 20,
    color: '#999',
  },
  superLikeButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  superLikeButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  likeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e91e63',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  likeButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  emptyTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e91e63',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
});