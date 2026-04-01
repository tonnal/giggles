import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithApple();
      router.push('/create-child-profile');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Could not sign in with Apple');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      // Navigation happens via auth state change in _layout.tsx
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Could not sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <MaterialIcons name="child-care" size={32} color={colors.primary} />
        <Text style={[styles.logoText, { color: colors.text }]}>Giggles</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {/* Decorative blobs */}
          <View style={[styles.blob1, { backgroundColor: `${colors.primary}1A` }]} />
          <View style={[styles.blob2, { backgroundColor: `${colors.primary}1A` }]} />

          <View style={[styles.imageCard, { backgroundColor: colors.surface }]}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800' }}
              style={styles.heroImage}
            />
            <LinearGradient
              colors={['transparent', `${colors.background}CC`]}
              style={styles.imageGradient}
            />
          </View>
        </View>

        {/* Headlines */}
        <View style={styles.headlinesContainer}>
          <Text style={[styles.headline, { color: colors.text }]}>
            Capture your child's memories in one place
          </Text>
          <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
            Turn everyday giggles into forever keepsakes.
          </Text>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Apple Button */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.button, styles.appleButton]}
              onPress={handleAppleSignIn}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="apple" size={20} color="#fff" />
                  <Text style={styles.appleButtonText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Google Button */}
          <TouchableOpacity
            style={[styles.button, styles.googleButton, {
              backgroundColor: colors.surface,
              borderColor: colorScheme === 'dark' ? '#3F3F46' : '#E5E7EB',
            }]}
            onPress={handleGoogleSignIn}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <MaterialIcons name="g-mobiledata" size={24} color={colors.text} />
                <Text style={[styles.googleButtonText, { color: colors.text }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textSecondary }]}>
          By continuing, you agree to our Terms of Service and confirm that you have read our Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  heroContainer: {
    width: '100%',
    position: 'relative',
    marginTop: 8,
    marginBottom: 32,
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
  imageCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#ee8c2b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  headlinesContainer: {
    gap: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
    textAlign: 'center',
  },
  buttonsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  appleButton: {
    backgroundColor: '#000',
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  googleButton: {
    borderWidth: 1,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 32,
    opacity: 0.4,
  },
});
