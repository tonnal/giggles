import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import CameraModal from '@/components/CameraModal';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Memory, WeeklyHighlight } from '@/types/api';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [showCamera, setShowCamera] = useState(false);
  const { user, familyId, childId } = useAuth();

  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [highlights, setHighlights] = useState<WeeklyHighlight[]>([]);

  useEffect(() => {
    if (familyId) {
      // Fetch recent memories
      api.get(`/api/memories?familyId=${familyId}&limit=5`)
        .then(res => {
          if (res.success) {
            setRecentMemories(res.data?.memories || res.data || []);
          }
        })
        .catch(() => {});

      // Fetch weekly highlights
      if (childId) {
        api.get(`/api/highlights/weekly?familyId=${familyId}&childId=${childId}&limit=3`)
          .then(res => {
            if (res.success) {
              setHighlights(res.data?.highlights || res.data || []);
            }
          })
          .catch(() => {});
      }
    }
  }, [familyId, childId]);

  const handleCloseCamera = useCallback(() => {
    setShowCamera(false);
    // Refresh memories after camera closes
    if (familyId) {
      api.get(`/api/memories?familyId=${familyId}&limit=5`)
        .then(res => {
          if (res.success) {
            setRecentMemories(res.data?.memories || res.data || []);
          }
        })
        .catch(() => {});
    }
  }, [familyId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Ambient Background Gradient */}
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? [colors.backgroundGradientStart, colors.backgroundGradientMid, colors.backgroundGradientEnd]
            : ['#ffffff', '#fffbf7', '#faeadd']
        }
        style={styles.gradientBackground}
      />

      {/* Top App Bar */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <TouchableOpacity style={styles.profileImageContainer}>
              <Image
                source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=5' }}
                style={styles.profileImage}
              />
              <View style={[styles.addBadge, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="add" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={styles.profileText}>
              <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
                Welcome back,
              </Text>
              <Text style={[styles.nameText, { color: colors.text }]}>{user?.name || 'there'}</Text>
            </View>
          </View>

          {/* Notification Button */}
          <TouchableOpacity
            style={[
              styles.notificationButton,
              {
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : colors.surface,
              },
            ]}
          >
            <MaterialIcons
              name="notifications"
              size={24}
              color={colorScheme === 'dark' ? colors.white : colors.text}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Content ScrollView */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Memories Carousel Section */}
        <View style={styles.memoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>MEMORIES</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.45 + 16}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
          >
            {/* Weekly Highlight Reel */}
            {highlights.length > 0 ? (
              highlights.map((h) => (
                <TouchableOpacity key={h._id} style={[styles.memoryCard, styles.memoryCardLarge]}>
                  <Image source={{ uri: h.coverImageUrl }} style={styles.memoryImage} />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.memoryGradient} />
                  {h.videoUrl && (
                    <View style={styles.playButton}>
                      <MaterialIcons name="play-arrow" size={16} color="#fff" />
                    </View>
                  )}
                  <View style={styles.memoryInfo}>
                    <Text style={styles.memoryTitle}>{h.title}</Text>
                    <Text style={styles.memorySubtitle}>{new Date(h.weekStartDate).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity style={[styles.memoryCard, styles.memoryCardLarge]}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400' }} style={styles.memoryImage} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.memoryGradient} />
                <View style={styles.memoryInfo}>
                  <Text style={styles.memoryTitle}>Weekly Reel</Text>
                  <Text style={styles.memorySubtitle}>Add memories to generate</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Recent Memories */}
            {recentMemories.slice(0, 3).map((m) => (
              <TouchableOpacity key={m._id} style={styles.memoryCard}>
                <Image source={{ uri: m.mediaUrl }} style={styles.memoryImage} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.memoryGradient} />
                {m.mediaType === 'video' && (
                  <View style={styles.playButton}>
                    <MaterialIcons name="play-arrow" size={16} color="#fff" />
                  </View>
                )}
                <View style={styles.memoryInfo}>
                  <Text style={styles.memoryTitle} numberOfLines={1}>{m.caption || 'Memory'}</Text>
                  <Text style={styles.memorySubtitle}>{new Date(m.date).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {recentMemories.length === 0 && (
              <TouchableOpacity style={styles.memoryCard}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400' }} style={styles.memoryImage} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={styles.memoryGradient} />
                <View style={styles.memoryInfo}>
                  <Text style={styles.memoryTitle}>Today's Giggles</Text>
                  <Text style={styles.memorySubtitle}>Tap to capture</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Spacer to push camera section */}
        <View style={styles.spacer} />

        {/* Camera Control Section */}
        <View style={styles.cameraSection}>
          {/* Headline */}
          <View style={styles.cameraHeader}>
            <Text style={[styles.cameraTitle, { color: colors.text }]}>
              Capture a moment
            </Text>
            <Text style={[styles.cameraSubtitle, { color: colors.textSecondary }]}>
              Don't let the little things fade away.
            </Text>
          </View>

          {/* Mode Chips */}
          <View
            style={[
              styles.modeChipsContainer,
              {
                backgroundColor:
                  colorScheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modeChip,
                captureMode === 'photo' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setCaptureMode('photo')}
            >
              <Text
                style={[
                  styles.modeChipText,
                  {
                    color:
                      captureMode === 'photo'
                        ? '#fff'
                        : colorScheme === 'dark'
                        ? '#9CA3AF'
                        : '#6B7280',
                  },
                ]}
              >
                PHOTO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeChip,
                captureMode === 'video' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setCaptureMode('video')}
            >
              <Text
                style={[
                  styles.modeChipText,
                  {
                    color:
                      captureMode === 'video'
                        ? '#fff'
                        : colorScheme === 'dark'
                        ? '#9CA3AF'
                        : '#6B7280',
                  },
                ]}
              >
                VIDEO
              </Text>
            </TouchableOpacity>
          </View>

          {/* Shutter Controls */}
          <View style={styles.shutterControls}>
            {/* Gallery Button */}
            <TouchableOpacity
              style={[
                styles.sideButton,
                {
                  backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
                  borderColor: colorScheme === 'dark' ? '#3F3F46' : '#F3F4F6',
                },
              ]}
            >
              <MaterialIcons
                name="photo-library"
                size={28}
                color={colorScheme === 'dark' ? '#E5E7EB' : '#374151'}
              />
            </TouchableOpacity>

            {/* Main Shutter Button */}
            <TouchableOpacity
              style={styles.shutterButton}
              activeOpacity={0.7}
              onPress={() => setShowCamera(true)}
            >
              <View style={[styles.shutterOuter, { borderColor: `${colors.primary}4D` }]} />
              <View
                style={[
                  styles.shutterMiddle,
                  {
                    borderColor: colorScheme === 'dark' ? colors.background : '#fff',
                  },
                ]}
              />
              <View style={[styles.shutterInner, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="camera-alt" size={32} color="#fff" style={{ opacity: 0.9 }} />
              </View>
            </TouchableOpacity>

            {/* Effects Button */}
            <TouchableOpacity
              style={[
                styles.sideButton,
                {
                  backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
                  borderColor: colorScheme === 'dark' ? '#3F3F46' : '#F3F4F6',
                },
              ]}
            >
              <MaterialIcons
                name="auto-awesome"
                size={28}
                color={colorScheme === 'dark' ? '#E5E7EB' : '#374151'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Camera Modal */}
      <CameraModal
        visible={showCamera}
        onClose={handleCloseCamera}
        initialMode={captureMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  header: {
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
  },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileText: {
    flexDirection: 'column',
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 110 : 100,
  },
  memoriesSection: {
    paddingTop: 8,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
  },
  carouselContent: {
    paddingHorizontal: 20,
    gap: 16,
    alignItems: 'flex-start',
  },
  memoryCard: {
    width: width > 600 ? 200 : width * 0.4,
    aspectRatio: 4 / 5,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  memoryCardLarge: {
    width: width > 600 ? 250 : width * 0.4,
  },
  memoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  memoryGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  playButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  memoryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  memorySubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  spacer: {
    flex: 1,
    minHeight: 100,
  },
  cameraSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cameraHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cameraTitle: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  cameraSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  modeChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    borderRadius: 100,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modeChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  shutterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    width: '100%',
    maxWidth: 400,
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shutterButton: {
    width: 96,
    height: 96,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
  },
  shutterMiddle: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
  },
  shutterInner: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ee8c2b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
