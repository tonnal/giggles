import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { WeeklyHighlight, Memory } from '@/types/api';

const { width } = Dimensions.get('window');

const albumColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF6B9D', '#C9ADA7', '#9BF6FF', '#FFADAD'];

interface AlbumSuggestion {
  type: string;
  title: string;
  description: string;
  memoryIds: string[];
}

export default function AlbumsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selectedFilter, setSelectedFilter] = useState('All');
  const { familyId, childId } = useAuth();

  const [albums, setAlbums] = useState<AlbumSuggestion[]>([]);
  const [highlights, setHighlights] = useState<WeeklyHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (refresh = false) => {
    if (!familyId) return;
    try {
      if (refresh) setRefreshing(true);

      const params = new URLSearchParams({ familyId });
      if (childId) params.set('childId', childId);

      const [albumsRes, highlightsRes] = await Promise.all([
        api.get(`/api/albums/suggestions?${params}`).catch(() => ({ success: false })),
        childId
          ? api.get(`/api/highlights/weekly?familyId=${familyId}&childId=${childId}&limit=4`).catch(() => ({ success: false }))
          : Promise.resolve({ success: false }),
      ]);

      if (albumsRes.success && albumsRes.data) {
        setAlbums(albumsRes.data.suggestions || []);
      }
      if (highlightsRes.success && highlightsRes.data) {
        setHighlights(highlightsRes.data.highlights || highlightsRes.data || []);
      }
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [familyId, childId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Albums
          </Text>
          <TouchableOpacity style={[styles.searchButton, { backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface }]}>
            <MaterialIcons name="search" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary} />
        }
      >
        {/* Stories / Highlights Section */}
        <View style={styles.storiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Highlights
            </Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContent}
          >
            {highlights.length > 0 ? highlights.map((h) => (
              <TouchableOpacity key={h._id} style={styles.storyItem} activeOpacity={0.8}>
                <View style={styles.storyImageContainer}>
                  <Image source={{ uri: h.coverImageUrl }} style={styles.storyImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.5)']}
                    style={styles.storyGradient}
                  />
                  {h.videoUrl && (
                    <View style={styles.playIcon}>
                      <MaterialIcons name="play-circle" size={18} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[styles.storyTitle, { color: colors.text }]} numberOfLines={1}>
                  {h.title}
                </Text>
              </TouchableOpacity>
            )) : (
              <View style={[styles.storyItem, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={[styles.storyTitle, { color: colors.textSecondary }]}>
                  No highlights yet
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Album Section Header */}
        <View style={styles.albumsHeaderSection}>
          <Text style={[styles.albumsTitle, { color: colors.text }]}>
            My Albums
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {['All', 'Favorites', 'Shared', 'Generated'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  selectedFilter === filter
                    ? {
                        backgroundColor: colorScheme === 'dark' ? colors.white : colors.text,
                      }
                    : {
                        backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : colors.surface,
                        borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      },
                ]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: selectedFilter === filter
                        ? colorScheme === 'dark' ? colors.text : colors.white
                        : colors.text,
                      fontWeight: selectedFilter === filter ? '700' : '500',
                    },
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Album Grid */}
        <View style={styles.albumGrid}>
          {/* Create New Album Card */}
          <TouchableOpacity
            style={[
              styles.createCard,
              {
                backgroundColor: `${colors.primary}0D`,
                borderColor: `${colors.primary}80`,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={[styles.createIcon, { backgroundColor: `${colors.primary}33` }]}>
              <MaterialIcons name="add" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.createText, { color: colors.primary }]}>
              Create Album
            </Text>
          </TouchableOpacity>

          {/* Album Cards */}
          {loading ? (
            <View style={{ width: '100%', paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : albums.length > 0 ? (
            albums.map((album, index) => (
              <TouchableOpacity
                key={`${album.type}-${index}`}
                style={styles.albumCard}
                activeOpacity={0.8}
              >
                <View style={[styles.albumImage, { backgroundColor: albumColors[index % albumColors.length] + '33', alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialIcons name="photo-library" size={48} color={albumColors[index % albumColors.length]} />
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.albumGradient}
                />
                <View style={styles.albumInfo}>
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {album.title}
                  </Text>
                  <Text style={styles.albumCount}>{album.memoryIds?.length || 0} photos</Text>
                </View>
                <View style={[styles.albumDot, { backgroundColor: albumColors[index % albumColors.length] }]} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ width: '100%', paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Add memories to see album suggestions</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  storiesSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  storiesContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    width: 96,
    gap: 8,
  },
  storyImageContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  playIcon: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
  },
  storyTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  albumsHeaderSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  albumsTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  filtersSection: {
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 14,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
  },
  createCard: {
    width: (width - 48) / 2,
    aspectRatio: 4 / 5,
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  createIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    fontSize: 14,
    fontWeight: '600',
  },
  albumCard: {
    width: (width - 48) / 2,
    aspectRatio: 4 / 5,
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  albumInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  albumTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  albumCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  albumDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
