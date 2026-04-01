import React, { useState, useEffect, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Memory } from '@/types/api';

const { width } = Dimensions.get('window');

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

export default function TimelineScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { familyId, childId, user } = useAuth();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [familyName, setFamilyName] = useState('My Family');

  const fetchMemories = useCallback(async (pageNum = 1, refresh = false) => {
    if (!familyId) return;
    try {
      if (refresh) setRefreshing(true);
      const params = new URLSearchParams({
        familyId,
        page: String(pageNum),
        limit: '20',
      });
      if (childId) params.set('childId', childId);

      const res = await api.get(`/api/memories?${params}`);
      if (res.success) {
        const fetched = res.data?.memories || res.data || [];
        setMemories(pageNum === 1 ? fetched : [...memories, ...fetched]);
      }
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyId, childId]);

  useEffect(() => {
    fetchMemories();
    if (familyId) {
      api.get(`/api/families/${familyId}`).then(res => {
        if (res.success && res.data) {
          setFamilyName(res.data.name || 'My Family');
        }
      }).catch(() => {});
    }
  }, [familyId, childId]);

  const handleReact = async (memoryId: string, emoji: string) => {
    try {
      await api.post(`/api/memories/${memoryId}/react`, { emoji });
      fetchMemories(1, true);
    } catch {}
  };

  const onRefresh = () => fetchMemories(1, true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {familyName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Making memories together
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.cameraButton, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="photo-camera" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              styles.filterChipActive,
              {
                backgroundColor: colorScheme === 'dark' ? colors.white : colors.text,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                styles.filterChipTextActive,
                { color: colorScheme === 'dark' ? colors.text : colors.white },
              ]}
            >
              All Memories
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
                borderColor: colorScheme === 'dark' ? '#3F3F46' : '#F3F4F6',
              },
            ]}
          >
            <Text style={[styles.filterChipText, { color: colors.text }]}>
              May 2024
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
                borderColor: colorScheme === 'dark' ? '#3F3F46' : '#F3F4F6',
              },
            ]}
          >
            <Text style={[styles.filterChipText, { color: colors.text }]}>
              First Steps
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
                borderColor: colorScheme === 'dark' ? '#3F3F46' : '#F3F4F6',
              },
            ]}
          >
            <MaterialIcons name="face" size={16} color={colors.text} />
            <Text style={[styles.filterChipText, { color: colors.text }]}>
              Chloe
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Scrollable Feed */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <View style={styles.endOfFeed}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : memories.length === 0 ? (
          <View style={styles.endOfFeed}>
            <MaterialIcons name="photo-camera" size={48} color={colors.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={[styles.endOfFeedText, { color: colors.textSecondary }]}>
              No memories yet. Capture your first moment!
            </Text>
          </View>
        ) : (
          memories.map((memory) => {
            const heartCount = memory.reactions?.filter(r => r.emoji === '❤️').length || 0;
            const smileCount = memory.reactions?.filter(r => r.emoji === '😂').length || 0;
            const uploaderName = typeof memory.uploadedBy === 'object' ? memory.uploadedBy.name : '';
            const uploaderAvatar = typeof memory.uploadedBy === 'object' ? memory.uploadedBy.avatar : undefined;
            const latestComment = memory.comments?.length > 0 ? memory.comments[memory.comments.length - 1] : null;

            return (
              <View
                key={memory._id}
                style={[
                  styles.memoryCard,
                  {
                    backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
                    borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'transparent',
                  },
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Image
                      source={{ uri: uploaderAvatar || `https://i.pravatar.cc/100?u=${memory.uploadedBy}` }}
                      style={styles.cardAvatar}
                    />
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>
                        {memory.caption || 'Memory'}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                        {getTimeAgo(memory.date)} {uploaderName ? `• ${uploaderName}` : ''}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.moreButton}>
                    <MaterialIcons name="more-horiz" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Media */}
                <View style={styles.mediaContainer}>
                  <Image source={{ uri: memory.mediaUrl }} style={styles.mediaImage} />
                  {memory.mediaType === 'video' && (
                    <View style={styles.videoIndicator}>
                      <MaterialIcons name="videocam" size={16} color="#fff" />
                    </View>
                  )}
                </View>

                {/* Content Body */}
                <View style={styles.cardBody}>
                  {memory.tags && memory.tags.length > 0 && (
                    <Text style={[styles.description, { color: colors.textSecondary, fontSize: 13 }]}>
                      {memory.tags.map(t => `#${t}`).join(' ')}
                    </Text>
                  )}

                  {/* Reaction Bar */}
                  <View style={styles.reactionBar}>
                    <TouchableOpacity
                      style={[
                        styles.reactionButton,
                        heartCount > 0 && styles.reactionButtonActive,
                        heartCount > 0 && { backgroundColor: `${colors.primary}1A` },
                      ]}
                      onPress={() => handleReact(memory._id, '❤️')}
                    >
                      <MaterialIcons name="favorite" size={20} color={heartCount > 0 ? colors.primary : colors.textSecondary} />
                      {heartCount > 0 && (
                        <Text style={[styles.reactionText, { color: colors.primary }]}>{heartCount}</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.reactionButton}
                      onPress={() => handleReact(memory._id, '😂')}
                    >
                      <MaterialIcons name="sentiment-satisfied" size={20} color={smileCount > 0 ? '#FBBF24' : colors.textSecondary} />
                      {smileCount > 0 && (
                        <Text style={[styles.reactionText, { color: colors.textSecondary }]}>{smileCount}</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.reactionButton}>
                      <MaterialIcons name="chat-bubble-outline" size={20} color={colors.textSecondary} />
                      {memory.comments?.length > 0 && (
                        <Text style={[styles.reactionText, { color: colors.textSecondary }]}>{memory.comments.length}</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Comment Preview */}
                  {latestComment && (
                    <View
                      style={[
                        styles.commentPreview,
                        {
                          backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.2)' : colors.background,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: typeof latestComment.userId === 'object' ? latestComment.userId.avatar || `https://i.pravatar.cc/100?u=${latestComment.userId.id}` : `https://i.pravatar.cc/100?u=${latestComment.userId}` }}
                        style={styles.commentAvatar}
                      />
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <Text style={[styles.commentAuthor, { color: colors.text }]}>
                            {typeof latestComment.userId === 'object' ? latestComment.userId.name : 'Someone'}
                          </Text>
                          <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                            {getTimeAgo(latestComment.createdAt)}
                          </Text>
                        </View>
                        <Text
                          style={[styles.commentText, { color: colorScheme === 'dark' ? '#D1D5DB' : colors.text }]}
                          numberOfLines={2}
                        >
                          {latestComment.text}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* End of Feed */}
        {!loading && memories.length > 0 && (
          <View style={styles.endOfFeed}>
            <MaterialIcons
              name="auto-stories"
              size={40}
              color={colors.textSecondary}
              style={{ opacity: 0.6 }}
            />
            <Text style={[styles.endOfFeedText, { color: colors.textSecondary }]}>
              You've reached the start of the scrapbook!
            </Text>
          </View>
        )}
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
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ee8c2b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  filtersSection: {
    paddingVertical: 8,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterChipActive: {
    borderWidth: 0,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
  },
  memoryCard: {
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
  },
  mediaContainer: {
    width: '100%',
    paddingHorizontal: 8,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  videoIndicator: {
    position: 'absolute',
    top: 12,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 8,
  },
  cardBody: {
    padding: 20,
    gap: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reactionButtonActive: {},
  reactionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  stackedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  stackedAvatarMore: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  commentPreview: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 10,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  endOfFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  endOfFeedText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.6,
  },
});
