import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { api, setToken, clearToken } from '@/services/api';
import { User } from '@/types/api';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEYS = {
  USER: 'giggles_user',
  FAMILY_ID: 'giggles_family_id',
  CHILD_ID: 'giggles_child_id',
};

interface AuthState {
  user: User | null;
  familyId: string | null;
  childId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  setFamilyId: (id: string) => Promise<void>;
  setChildId: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    familyId: null,
    childId: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Google OAuth setup
  // In Expo Go, iosClientId must use the web client ID since it runs a web-based OAuth flow
  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: 'https://auth.expo.io/@anonymous/mobile',
  });

  // Restore session on app start
  useEffect(() => {
    restoreSession();
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        handleOAuthSuccess('google', authentication.accessToken);
      }
    }
  }, [googleResponse]);

  const restoreSession = async () => {
    try {
      const [userJson, familyId, childId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER),
        AsyncStorage.getItem(STORAGE_KEYS.FAMILY_ID),
        AsyncStorage.getItem(STORAGE_KEYS.CHILD_ID),
      ]);

      if (userJson) {
        const user = JSON.parse(userJson) as User;
        setState({
          user,
          familyId,
          childId,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleOAuthSuccess = async (provider: 'google' | 'apple', accessToken: string, userData?: { email?: string; name?: string }) => {
    try {
      // Get user info from Google if needed
      let email = userData?.email;
      let name = userData?.name;
      let avatar: string | undefined;

      if (provider === 'google' && !email) {
        const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userInfo = await userInfoRes.json();
        email = userInfo.email;
        name = userInfo.name;
        avatar = userInfo.picture;
      }

      // Authenticate with our backend
      const response = await api.post('/api/auth/mobile', {
        provider,
        token: accessToken,
        email,
        name,
        avatar,
      });

      if (response.success && response.data) {
        await setToken(response.data.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));

        setState(prev => ({
          ...prev,
          user: response.data.user,
          isAuthenticated: true,
        }));
      }
    } catch (error) {
      console.error('Auth error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    await googlePromptAsync();
  };

  const signInWithApple = async () => {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign In is only available on iOS');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        await handleOAuthSuccess('apple', credential.identityToken, {
          email: credential.email || undefined,
          name: credential.fullName
            ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
            : undefined,
        });
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        throw error;
      }
    }
  };

  const signOut = async () => {
    await clearToken();
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER,
      STORAGE_KEYS.FAMILY_ID,
      STORAGE_KEYS.CHILD_ID,
    ]);
    setState({
      user: null,
      familyId: null,
      childId: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const setFamilyIdValue = async (id: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_ID, id);
    setState(prev => ({ ...prev, familyId: id }));
  };

  const setChildIdValue = async (id: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.CHILD_ID, id);
    setState(prev => ({ ...prev, childId: id }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithGoogle,
        signInWithApple,
        signOut,
        setFamilyId: setFamilyIdValue,
        setChildId: setChildIdValue,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
