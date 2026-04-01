import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const familyMembers = [
  { id: 'mom', label: 'Mom', icon: 'face-3', color: '#FFEFF2', iconColor: '#FB7185' },
  { id: 'dad', label: 'Dad', icon: 'face', color: '#E0F2FE', iconColor: '#38BDF8' },
  { id: 'grandma', label: 'Grandma', icon: 'face-2', color: '#FEF3C7', iconColor: '#FBBF24' },
  { id: 'grandpa', label: 'Grandpa', icon: 'face-6', color: '#F3E8FF', iconColor: '#A78BFA' },
  { id: 'sibling', label: 'Sibling', icon: 'face-4', color: '#DBEAFE', iconColor: '#60A5FA' },
  { id: 'other', label: 'Other', icon: 'group', color: '#E0E7FF', iconColor: '#818CF8' },
];

export default function CreateFamilySpaceScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { familyId } = useAuth();

  const [selected, setSelected] = useState<string[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (familyId) {
      api.get(`/api/families/${familyId}`).then((res) => {
        if (res.success && res.data) {
          setInviteCode(res.data.inviteCode);
        }
      }).catch(() => {});
    }
  }, [familyId]);

  const toggleSelection = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (inviteCode && selected.length > 0) {
      try {
        await Share.share({
          message: `Join our family on Giggles! Use invite code: ${inviteCode}`,
        });
      } catch {}
    }
    router.replace('/(tabs)');
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={[styles.illustrationCard, { backgroundColor: `${colors.primary}0D` }]}>
            {/* Decorative circles */}
            <View style={[styles.blob1, { backgroundColor: `${colors.primary}1A` }]} />
            <View style={[styles.blob2, { backgroundColor: `${colors.primary}1A` }]} />

            {/* Family circle image */}
            <View style={[styles.familyCircle, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="family-restroom" size={64} color={colors.primary} />
            </View>

            {/* Camera badge */}
            <View style={[styles.cameraBadge, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="photo-camera" size={24} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Headline & Copy */}
        <View style={styles.headlineContainer}>
          <Text style={[styles.headline, { color: colors.text }]}>
            Who's in your family?
          </Text>
          <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
            Invite them to start capturing sweet childhood memories together.
          </Text>
        </View>

        {/* Selection Grid */}
        <View style={styles.grid}>
          {familyMembers.map((member) => {
            const isSelected = selected.includes(member.id);
            return (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isSelected ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => toggleSelection(member.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.memberIcon,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#3d2e2e' : member.color,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={member.icon as any}
                    size={28}
                    color={colorScheme === 'dark' ? colors.textSecondary : member.iconColor}
                  />
                </View>
                <Text style={[styles.memberLabel, { color: isSelected ? colors.primary : colors.text }]}>
                  {member.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.9}
          disabled={selected.length === 0}
        >
          <Text style={styles.continueButtonText}>
            {selected.length > 0 ? `Continue with ${selected.length} Members` : 'Continue'}
          </Text>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  illustrationCard: {
    width: '80%',
    maxWidth: 280,
    aspectRatio: 4 / 3,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.3,
  },
  blob2: {
    position: 'absolute',
    bottom: -16,
    left: -16,
    width: 128,
    height: 128,
    borderRadius: 64,
    opacity: 0.3,
  },
  familyCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 8,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 24,
    right: 64,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ rotate: '12deg' }],
  },
  headlineContainer: {
    paddingVertical: 16,
    gap: 12,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 280,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  memberCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  memberIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  memberLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  inviteTag: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTagText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#ee8c2b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
