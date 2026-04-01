# 🔐 Authentication System

## Overview

Giggles uses **NextAuth.js** for authentication with **Google OAuth** and **Apple Sign In** support.

---

## 🏗️ Architecture

### Components

1. **NextAuth Configuration** (`lib/auth/auth-config.ts`)
   - Google OAuth provider
   - Apple Sign In provider
   - JWT session strategy
   - Custom callbacks for user management

2. **Session Utilities** (`lib/auth/session.ts`)
   - `getCurrentUser()` - Get current session
   - `getCurrentUserData()` - Get full user data from DB
   - `requireAuth()` - Require authentication (throws if not logged in)
   - `getCurrentUserId()` - Get user ID as ObjectId

3. **MongoDB Adapter** (`lib/db/mongodb-adapter.ts`)
   - Connects NextAuth to MongoDB
   - Manages sessions, accounts, verification tokens

---

## 📡 API Endpoints

### Authentication Endpoints (NextAuth)

```bash
# Sign in with Google
GET /api/auth/signin/google

# Sign in with Apple
GET /api/auth/signin/apple

# Sign out
POST /api/auth/signout

# Get session
GET /api/auth/session

# CSRF token
GET /api/auth/csrf
```

### Custom Endpoints

```bash
# Get current user data
GET /api/auth/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar": "https://...",
      "authProvider": "google",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## 🔧 Setup

### 1. Generate NextAuth Secret

Generate a secure random string:

```bash
openssl rand -base64 32
```

Add to `.env`:
```bash
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### 2. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google
   ```
7. Copy **Client ID** and **Client Secret** to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-abc123...
   ```

### 3. Setup Apple Sign In

1. Go to [Apple Developer](https://developer.apple.com/)
2. Sign in with your Apple Developer account
3. Go to **Certificates, Identifiers & Profiles**
4. Create a **Services ID** (this is your `APPLE_CLIENT_ID`)
5. Enable **Sign In with Apple**
6. Configure domains and return URLs:
   ```
   Domain: yourdomain.com
   Return URL: https://yourdomain.com/api/auth/callback/apple
   ```
7. Create a **Key** with Sign In with Apple enabled
8. Download the `.p8` file
9. Generate client secret using the key (see NextAuth Apple docs)
10. Add to `.env`:
    ```bash
    APPLE_CLIENT_ID=com.yourdomain.service
    APPLE_CLIENT_SECRET=your-generated-jwt-token
    ```

---

## 💻 Usage

### In API Routes

```typescript
import { requireAuth, getCurrentUserId } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    // Require authentication
    const user = await requireAuth();

    // Get user ID
    const userId = await getCurrentUserId();

    // Your logic here
    return successResponse({ message: 'Success' });
  });
}
```

### Check Authentication Status

```typescript
import { getCurrentUser } from '@/lib/auth/session';

const user = await getCurrentUser();

if (!user) {
  return errorResponse('Unauthorized', 401);
}

console.log('Authenticated user:', user.email);
```

### Get Full User Data

```typescript
import { getCurrentUserData } from '@/lib/auth/session';

const userData = await getCurrentUserData();

if (!userData) {
  return errorResponse('Not authenticated', 401);
}

console.log('User data:', userData);
```

---

## 📱 Mobile App Integration

### Sign In Flow

```typescript
// React Native / Expo

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';

// Google Sign In
const [request, response, promptAsync] = Google.useAuthRequest({
  expoClientId: 'YOUR_EXPO_CLIENT_ID',
  iosClientId: 'YOUR_IOS_CLIENT_ID',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  webClientId: 'YOUR_WEB_CLIENT_ID',
});

// Sign in with Google
await promptAsync();

// Apple Sign In
const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

// Send to backend
const response = await fetch('https://api.giggles.com/api/auth/callback/apple', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ credential }),
});
```

### Get Current Session

```typescript
const response = await fetch('/api/auth/me', {
  credentials: 'include', // Include cookies
});

const { data } = await response.json();
console.log('Current user:', data.user);
```

### Sign Out

```typescript
await fetch('/api/auth/signout', {
  method: 'POST',
  credentials: 'include',
});
```

---

## 🔒 Security Features

### Built-in Security

- ✅ **CSRF Protection** - Automatic CSRF token validation
- ✅ **Secure Cookies** - HttpOnly, Secure, SameSite cookies
- ✅ **JWT Signing** - All tokens are signed with secret
- ✅ **Session Expiry** - Sessions expire after 30 days
- ✅ **Email Verification** - Optional (not yet implemented)

### Best Practices

1. **Never expose credentials** in client-side code
2. **Always use HTTPS** in production
3. **Rotate secrets** regularly
4. **Use strong secrets** (min 32 characters)
5. **Implement rate limiting** on auth endpoints
6. **Monitor failed login attempts**

---

## 🧪 Testing Authentication

### Test Sign In

```bash
# Start the dev server
npm run dev

# Open browser
open http://localhost:3000/api/auth/signin

# Select provider (Google or Apple)
# Complete OAuth flow

# Check session
curl http://localhost:3000/api/auth/session
```

### Test Protected Endpoint

```typescript
// Create a test protected route
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  return successResponse({ message: `Hello ${user.name}!` });
}
```

---

## 🐛 Troubleshooting

### "Configuration error: There is a problem with the server configuration."

**Solution:** Check `NEXTAUTH_SECRET` is set and at least 32 characters long.

### "Callback URL Mismatch"

**Solution:** Ensure authorized redirect URIs match in OAuth provider settings:
- Google: `http://localhost:3000/api/auth/callback/google`
- Apple: `http://localhost:3000/api/auth/callback/apple`

### "Cannot read properties of undefined (reading 'user')"

**Solution:** Session not initialized. Ensure you're using `getServerSession(authOptions)`.

### "MongoClient must be connected"

**Solution:** MongoDB connection issue. Check `MONGODB_URI` is correct.

---

## 📊 Database Schema

NextAuth creates these collections automatically:

### `users` Collection
```json
{
  "_id": "ObjectId",
  "name": "John Doe",
  "email": "user@example.com",
  "emailVerified": null,
  "image": "https://...",
  "authProvider": "google",
  "providerAccountId": "123456789"
}
```

### `accounts` Collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "type": "oauth",
  "provider": "google",
  "providerAccountId": "123456789",
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1234567890
}
```

### `sessions` Collection
```json
{
  "_id": "ObjectId",
  "sessionToken": "abc123...",
  "userId": "ObjectId",
  "expires": "2024-02-15T10:30:00.000Z"
}
```

---

## 🔄 Session Management

### Session Storage

- **Strategy:** JWT (stored in HTTP-only cookie)
- **Expiry:** 30 days
- **Refresh:** Automatic on activity

### Session Validation

Every API request automatically validates the session via NextAuth middleware.

---

## 🚀 Production Deployment

### Environment Variables

Ensure these are set in production:

```bash
NEXTAUTH_URL=https://api.yourdomain.com
NEXTAUTH_SECRET=<strong-random-secret>
GOOGLE_CLIENT_ID=<production-google-client-id>
GOOGLE_CLIENT_SECRET=<production-google-secret>
APPLE_CLIENT_ID=<production-apple-client-id>
APPLE_CLIENT_SECRET=<production-apple-secret>
```

### OAuth Redirect URIs

Update OAuth providers with production URLs:
- Google: `https://api.yourdomain.com/api/auth/callback/google`
- Apple: `https://api.yourdomain.com/api/auth/callback/apple`

---

## 📚 References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Setup](https://next-auth.js.org/providers/google)
- [Apple Sign In Setup](https://next-auth.js.org/providers/apple)
- [MongoDB Adapter](https://authjs.dev/reference/adapter/mongodb)

---

**Authentication is now fully configured! Users can sign in with Google or Apple. 🎉**
