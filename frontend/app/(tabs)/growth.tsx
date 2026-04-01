import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { Child, Milestone, GrowthLog } from '@/types/api';

const { width } = Dimensions.get('window');

const milestoneIcons: Record<string, string> = {
  first_steps: 'directions-walk',
  first_word: 'chat-bubble',
  first_tooth: 'emoji-emotions',
  first_day_school: 'school',
  first_birthday: 'cake',
  other: 'auto-awesome',
};

function getAge(dob: string): { years: number; months: number; days: number; label: string } {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
  const label = years > 0 ? `${years} Year${years > 1 ? 's' : ''} Old` : `${months} Month${months !== 1 ? 's' : ''} Old`;
  return { years, months, days, label };
}

export default function GrowthScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { familyId, childId } = useAuth();

  const [child, setChild] = useState<Child | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [growthLogs, setGrowthLogs] = useState<GrowthLog[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (refresh = false) => {
    if (!childId || !familyId) return;
    try {
      if (refresh) setRefreshing(true);

      const [childRes, memoriesRes] = await Promise.all([
        api.get(`/api/children/${childId}`),
        api.get(`/api/memories?familyId=${familyId}&childId=${childId}&limit=1`),
      ]);

      if (childRes.success && childRes.data) {
        setChild(childRes.data);
      }

      if (memoriesRes.success) {
        const pagination = memoriesRes.data?.pagination || memoriesRes.pagination;
        setMemoryCount(pagination?.total || 0);
      }
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [childId, familyId]);

  const age = child?.dob ? getAge(child.dob) : null;
  const latestGrowth = growthLogs.length > 0 ? growthLogs[0] : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Growth Tracker
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {child?.name ? `${child.name}'s Journey` : 'Journey'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface }]}
          >
            <MaterialIcons name="more-vert" size={24} color={colors.text} />
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
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
        <>
        {/* Age Card */}
        <View style={[styles.ageCard, { backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface }]}>
          <LinearGradient
            colors={[`${colors.primary}15`, `${colors.primary}05`]}
            style={styles.ageGradient}
          />
          <View style={styles.ageContent}>
            <MaterialIcons name="cake" size={48} color={colors.primary} />
            <View style={styles.ageInfo}>
              <Text style={[styles.ageNumber, { color: colors.text }]}>
                {age?.label || 'Age unknown'}
              </Text>
              <Text style={[styles.ageSub, { color: colors.textSecondary }]}>
                {child?.dob ? `Born on ${new Date(child.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Birthday not set'}
              </Text>
            </View>
          </View>
          <Text style={[styles.daysText, { color: colors.textSecondary }]}>
            {age ? `${age.days.toLocaleString()} days of giggles` : ''}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
              },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: '#FFE66D1A' }]}>
              <MaterialIcons name="photo-camera" size={24} color="#FFE66D" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{memoryCount.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Memories
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
              },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: '#4ECDC41A' }]}>
              <MaterialIcons name="straighten" size={24} color="#4ECDC4" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{latestGrowth?.height ? `${latestGrowth.height} cm` : '--'}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Height
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
              },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: '#FF6B6B1A' }]}>
              <MaterialIcons name="monitor-weight" size={24} color="#FF6B6B" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{latestGrowth?.weight ? `${latestGrowth.weight} kg` : '--'}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Weight
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
              },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: '#A8E6CF1A' }]}>
              <MaterialIcons name="auto-awesome" size={24} color="#A8E6CF" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>{milestones.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Milestones
            </Text>
          </View>
        </View>

        {/* Milestones Section */}
        <View style={styles.milestonesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Milestones
            </Text>
            <TouchableOpacity>
              <MaterialIcons name="add-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.milestonesList}>
            {milestones.length > 0 ? milestones.map((milestone) => (
              <View
                key={milestone._id}
                style={[
                  styles.milestoneItem,
                  { backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface },
                ]}
              >
                <View
                  style={[
                    styles.milestoneIconContainer,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <MaterialIcons
                    name={(milestoneIcons[milestone.category] || 'auto-awesome') as any}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={[styles.milestoneTitle, { color: colors.text }]}>
                    {milestone.title}
                  </Text>
                  <Text style={[styles.milestoneDate, { color: colors.textSecondary }]}>
                    {new Date(milestone.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <MaterialIcons name="check-circle" size={24} color={colors.primary} />
              </View>
            )) : (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary }}>
                  Milestones will appear as you add memories
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* This Month Section */}
        <View style={styles.monthSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            This Month
          </Text>
          <View
            style={[
              styles.monthCard,
              {
                backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
              },
            ]}
          >
            <LinearGradient
              colors={['#FFE66D15', 'transparent']}
              style={styles.monthGradient}
            />
            <Text style={[styles.monthText, { color: colors.text }]}>
              "Started saying full sentences and loves telling stories about her day at
              preschool. She's becoming such a little conversationalist!"
            </Text>
            <Text style={[styles.monthDate, { color: colors.textSecondary }]}>
              May 2024
            </Text>
          </View>
        </View>

        {/* Growth Chart Placeholder */}
        <View style={styles.chartSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Growth Chart
          </Text>
          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: colorScheme === 'dark' ? colors.surface : colors.surface,
              },
            ]}
          >
            <View style={styles.chartPlaceholder}>
              <MaterialIcons name="show-chart" size={48} color={colors.textSecondary} style={{ opacity: 0.3 }} />
              <Text style={[styles.chartPlaceholderText, { color: colors.textSecondary }]}>
                Growth chart visualization coming soon
              </Text>
            </View>
          </View>
        </View>
        </>
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
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  menuButton: {
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 140,
  },
  ageCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  ageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  ageInfo: {
    flex: 1,
  },
  ageNumber: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  ageSub: {
    fontSize: 14,
    marginTop: 4,
  },
  daysText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    width: (width - 56) / 2,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  milestonesSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  milestonesList: {
    gap: 12,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  milestoneIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  milestoneDate: {
    fontSize: 13,
  },
  monthSection: {
    marginBottom: 32,
  },
  monthCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  monthGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  monthText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  monthDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartSection: {
    marginBottom: 32,
  },
  chartCard: {
    borderRadius: 20,
    padding: 32,
    marginTop: 16,
    height: 200,
  },
  chartPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  chartPlaceholderText: {
    fontSize: 14,
    opacity: 0.6,
  },
});
