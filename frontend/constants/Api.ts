import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Production API URL from environment
const PRODUCTION_API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://613fe85a-9402-47eb-828e-4998d84bb55f.preview.emergentagent.com';

// Android emulator uses 10.0.2.2 to reach host machine's localhost
// iOS simulator uses localhost directly
const getDevApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8001';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:8001';
  }
  // Web or other - use production URL directly
  return PRODUCTION_API_URL;
};

export const API_BASE_URL = __DEV__ ? getDevApiUrl() : PRODUCTION_API_URL;
