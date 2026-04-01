import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

export default function CreateChildProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user, setFamilyId, setChildId } = useAuth();

  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<'boy' | 'girl' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', "Please enter your child's name");
      return;
    }

    try {
      setLoading(true);

      // Parse birthday if provided
      let dob: string | undefined;
      if (birthday) {
        const parts = birthday.split('/');
        if (parts.length === 3) {
          dob = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`).toISOString();
        }
      }

      // Create family + child in one call
      const response = await api.post('/api/families', {
        name: `${user?.name || 'My'}'s Family`,
        childName: name.trim(),
        childDob: dob,
        childGender: selectedGender || undefined,
      });

      if (response.success && response.data) {
        await setFamilyId(response.data.family._id);
        await setChildId(response.data.child._id);
        router.push('/create-family-space');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not create profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <View style={styles.headlineContainer}>
          <Text style={[styles.headline, { color: colors.text }]}>
            Tell us about your{'\n'}
            <Text style={{ color: colors.primary }}>little one</Text>
          </Text>
        </View>

        {/* Avatar Uploader */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            style={[styles.avatarButton, {
              borderColor: `${colors.primary}4D`,
              backgroundColor: colors.surface,
            }]}
            onPress={handlePickPhoto}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.avatarImage}
              />
            ) : (
              <MaterialIcons name="add-a-photo" size={48} color={colors.primary} />
            )}

            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="edit" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarLabel, { color: colors.textSecondary }]}>
            Add a cute photo
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Child's Name */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Child's Name</Text>
            <View style={[styles.inputContainer, {
              backgroundColor: colors.surface,
              borderColor: colorScheme === 'dark' ? '#4a3b2f' : '#e7dbcf',
            }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. Oliver"
                placeholderTextColor={`${colors.textSecondary}80`}
                value={name}
                onChangeText={setName}
              />
              <MaterialIcons name="face" size={24} color={colors.textSecondary} style={styles.inputIcon} />
            </View>
          </View>

          {/* Birthday */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Birthday</Text>
            <View style={[styles.inputContainer, {
              backgroundColor: colors.surface,
              borderColor: colorScheme === 'dark' ? '#4a3b2f' : '#e7dbcf',
            }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={`${colors.textSecondary}80`}
                value={birthday}
                onChangeText={setBirthday}
              />
              <MaterialIcons name="cake" size={24} color={colors.textSecondary} style={styles.inputIcon} />
            </View>
          </View>

          {/* Gender (Optional) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Gender <Text style={{ color: colors.textSecondary, fontSize: 12 }}>(optional)</Text>
            </Text>
            <View style={styles.genderButtons}>
              <TouchableOpacity
                style={[styles.genderButton, {
                  backgroundColor: colors.surface,
                  borderColor: selectedGender === 'boy' ? colors.primary : (colorScheme === 'dark' ? '#4a3b2f' : '#e7dbcf'),
                }]}
                onPress={() => setSelectedGender(selectedGender === 'boy' ? null : 'boy')}
              >
                <MaterialIcons name="boy" size={24} color={selectedGender === 'boy' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.genderButtonText, { color: selectedGender === 'boy' ? colors.primary : colors.text }]}>Boy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, {
                  backgroundColor: colors.surface,
                  borderColor: selectedGender === 'girl' ? colors.primary : (colorScheme === 'dark' ? '#4a3b2f' : '#e7dbcf'),
                }]}
                onPress={() => setSelectedGender(selectedGender === 'girl' ? null : 'girl')}
              >
                <MaterialIcons name="girl" size={24} color={selectedGender === 'girl' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.genderButtonText, { color: selectedGender === 'girl' ? colors.primary : colors.text }]}>Girl</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleContinue}
          activeOpacity={0.9}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <MaterialIcons name="arrow-forward" size={24} color="#fff" />
            </>
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  headlineContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  headline: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
  },
  avatarButton: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 4,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 72,
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    gap: 24,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },
  inputIcon: {
    marginLeft: 12,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
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
});
