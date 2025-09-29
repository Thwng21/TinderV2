import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  StatusBar,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';


const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.68;

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
  const [scale] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      const opacity = Math.max(0.5, 1 - Math.abs(gestureState.dx) / width);
      cardOpacity.setValue(opacity);
    },
    onPanResponderRelease: (evt, gestureState) => {
      const swipeThreshold = width * 0.3;
      
      if (gestureState.dx > swipeThreshold) {
        swipeRight();
      } else if (gestureState.dx < -swipeThreshold) {
        swipeLeft();
      } else {
        Animated.parallel([
          Animated.spring(pan, { 
            toValue: { x: 0, y: 0 }, 
            useNativeDriver: false,
            friction: 5 
          }),
          Animated.timing(cardOpacity, { 
            toValue: 1, 
            duration: 200, 
            useNativeDriver: false 
          })
        ]).start();
      }
    },
  });

  const swipeLeft = () => {
    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: -width * 1.2, y: 0 },
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      })
    ]).start(() => {
      nextProfile();
    });
  };

  const swipeRight = () => {
    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: width * 1.2, y: 0 },
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      })
    ]).start(() => {
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
    if (Math.random() > 0.7) {
      setMatchCount(prev => prev + 1);
      Alert.alert('🎉 It\'s a Match!', 'Bạn và ' + mockProfiles[currentProfileIndex].name + ' đã match!');
    }
    nextProfile();
  };

  const handlePass = () => {
    swipeLeft();
  };

  const nextProfile = () => {
    pan.setValue({ x: 0, y: 0 });
    cardOpacity.setValue(1);
    
    if (currentProfileIndex < mockProfiles.length - 1) {
      setCurrentProfileIndex(currentProfileIndex + 1);
    } else {
      setCurrentProfileIndex(0);
    }
  };

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
      outputRange: ['-15deg', '0deg', '15deg'],
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
                { translateY: pan.y },
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
                inputRange: [0, width * 0.3],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              })
            }
          ]}>
            <AntDesign name="heart" size={50} color="#4CAF50" />
          </Animated.View>
          
          <Animated.View style={[
            styles.swipeIndicator,
            styles.passIndicator,
            {
              opacity: pan.x.interpolate({
                inputRange: [-width * 0.3, 0],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              })
            }
          ]}>
            <MaterialIcons name="close" size={50} color="#f44336" />
          </Animated.View>

          {/* Profile Image */}
          <View style={styles.imageContainer}>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                {profile.name.charAt(0)}
              </Text>
            </View>
            
            {/* Gradient overlay for better text visibility */}
            <View style={styles.gradientOverlay}>
              <View style={styles.gradientInner} />
            </View>
            
            {profile.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={32} color="#2196F3" />
              </View>
            )}
            
            {/* Profile info overlay */}
            <View style={styles.profileInfoOverlay}>
              <View style={styles.profileHeader}>
                <View style={styles.nameSection}>
                  <Text style={styles.profileName}>
                    {profile.name}, {profile.age}
                  </Text>
                  <View style={styles.distanceTag}>
                    <Ionicons name="location-sharp" size={12} color="#fff" />
                    <Text style={styles.distance}>{profile.distance}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.infoButton}>
                  <Ionicons name="information-circle-outline" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.profileBio} numberOfLines={2}>
                {profile.bio}
              </Text>
              
              {renderInterests(profile.interests)}
            </View>
          </View>
        </Animated.View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rewindButton]} 
            onPress={() => Alert.alert('Rewind', 'Quay lại profile trước!')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-undo" size={24} color="#FFC107" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.passButtonLarge]} 
            onPress={handlePass}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={32} color="#f44336" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.superLikeButton]} 
            onPress={() => Alert.alert('Super Like', 'Super Like gửi đi!')}
            activeOpacity={0.7}
          >
            <AntDesign name="star" size={28} color="#2196F3" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.likeButtonLarge]} 
            onPress={() => swipeRight()}
            activeOpacity={0.7}
          >
            <AntDesign name="heart" size={32} color="#4CAF50" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.boostButton]} 
            onPress={() => Alert.alert('Boost', 'Tính năng Boost!')}
            activeOpacity={0.7}
          >
            <Ionicons name="flash" size={24} color="#9C27B0" />
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
            <View style={styles.emptyIconContainer}>
              <AntDesign name="heart" size={60} color="#e91e63" />
            </View>
            <Text style={styles.emptyText}>
              {matchCount === 0 ? 'Chưa có match' : `${matchCount} Matches`}
            </Text>
            <Text style={styles.emptySubText}>
              {matchCount === 0 
                ? 'Hãy tiếp tục vuốt để tìm người phù hợp!' 
                : 'Nhấn vào match để bắt đầu trò chuyện!'
              }
            </Text>
          </View>
        );
      case 'messages':
        return (
          <View style={styles.emptyTab}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="chatbubbles" size={60} color="#e91e63" />
            </View>
            <Text style={styles.emptyText}>Chưa có tin nhắn</Text>
            <Text style={styles.emptySubText}>
              Khi có match, bạn có thể bắt đầu trò chuyện ngay!
            </Text>
          </View>
        );
      case 'profile':
        return (
          <View style={styles.emptyTab}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="person" size={60} color="#e91e63" />
            </View>
            <Text style={styles.emptyText}>Hồ sơ của bạn</Text>
            <Text style={styles.emptySubText}>
              Chỉnh sửa thông tin và ảnh của bạn
            </Text>
            <TouchableOpacity style={styles.editProfileButton}>
              <Text style={styles.editProfileButtonText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerIconButton}
          onPress={() => setActiveTab('profile')}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.logoContainer}>
            <Ionicons name="flame" size={32} color="#e91e63" />
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.headerIconButton}
          onPress={handleLogout}
        >
          <Ionicons name="settings-outline" size={28} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Modern Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setActiveTab('discover')}
        >
          <Ionicons 
            name={activeTab === 'discover' ? 'flame' : 'flame-outline'} 
            size={28} 
            color={activeTab === 'discover' ? '#e91e63' : '#999'} 
          />
          {activeTab === 'discover' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setActiveTab('matches')}
        >
          <View>
            <AntDesign 
              name="star" 
              size={26} 
              color={activeTab === 'matches' ? '#e91e63' : '#999'} 
            />
            {matchCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{matchCount}</Text>
              </View>
            )}
          </View>
          {activeTab === 'matches' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setActiveTab('messages')}
        >
          <Ionicons 
            name={activeTab === 'messages' ? 'chatbubbles' : 'chatbubbles-outline'} 
            size={26} 
            color={activeTab === 'messages' ? '#e91e63' : '#999'} 
          />
          {activeTab === 'messages' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons 
            name={activeTab === 'profile' ? 'person' : 'person-outline'} 
            size={26} 
            color={activeTab === 'profile' ? '#e91e63' : '#999'} 
          />
          {activeTab === 'profile' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerIconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e91e63',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  discoverTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  cardContainer: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  profileCard: {
    width: width - 20,
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
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
    fontSize: 120,
    color: '#fff',
    fontWeight: 'bold',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  gradientInner: {
    flex: 1,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(0,0,0,0.6)',
      },
      android: {
        backgroundColor: 'rgba(0,0,0,0.6)',
      },
    }),
  },
  verifiedBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameSection: {
    flex: 1,
  },
  profileName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  distanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    backdropFilter: 'blur(10px)',
  },
  distance: {
    fontSize: 13,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  profileBio: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(10px)',
  },
  interestText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  swipeIndicator: {
    position: 'absolute',
    top: '45%',
    zIndex: 1000,
    padding: 20,
  },
  likeIndicator: {
    right: 30,
  },
  passIndicator: {
    left: 30,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  rewindButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  passButtonLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  superLikeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  likeButtonLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  boostButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  emptyTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  editProfileButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#e91e63',
    borderRadius: 25,
    shadowColor: '#e91e63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  editProfileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e91e63',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#e91e63',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});