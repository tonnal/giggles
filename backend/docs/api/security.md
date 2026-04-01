# 🔒 API Security & Authentication

## Overview

All API endpoints now require authentication and enforce proper authorization based on family membership.

---

## 🛡️ Security Model

### Authentication
- All endpoints require a valid NextAuth session
- JWT tokens are validated on every request
- Unauthorized requests return `401 Unauthorized`

### Authorization
- Users can only access data from families they are members of
- Family membership is verified before allowing access to children, memories, etc.
- Unauthorized access attempts return `403 Forbidden`

---

## 🔐 Protected Endpoints

### Authentication Endpoints

```bash
# Get current user data
GET /api/auth/me
Authorization: Required
Returns: Current user profile
```

### Children Endpoints

```bash
# Create a child (must be family member)
POST /api/children
Authorization: Required
Body: { familyId, name, dob?, gender?, photoUrl? }
Checks: User must be a member of the family

# Get all children for a family (must be family member)
GET /api/children?familyId=xxx
Authorization: Required
Checks: User must be a member of the family

# Get specific child (must have access to child's family)
GET /api/children/:id
Authorization: Required
Checks: User must be a member of child's family

# Update child (must have access to child's family)
PATCH /api/children/:id
Authorization: Required
Checks: User must be a member of child's family

# Delete child (must have access to child's family)
DELETE /api/children/:id
Authorization: Required
Checks: User must be a member of child's family
```

### Family Endpoints

```bash
# Create a new family (authenticated user becomes owner)
POST /api/families
Authorization: Required
Body: { name, childName, childDob?, childGender? }
Creates: Family + First Child

# Get all families for authenticated user
GET /api/families
Authorization: Required
Returns: Only families where user is a member

# Get specific family (must be member)
GET /api/families/:id
Authorization: Required
Checks: User must be a member of the family

# Update family (must be member)
PATCH /api/families/:id
Authorization: Required
Checks: User must be a member of the family

# Join family with invite code
POST /api/families/join
Authorization: Required
Body: { inviteCode, role }
```

### Memory Endpoints

```bash
# Create a memory (must be family member)
POST /api/memories
Authorization: Required
Body: { familyId, childId, mediaUrl, mediaType, caption, ... }
Checks: User must be a member of the family
Features: AI auto-tagging, milestone detection, auto-album assignment

# Get memories (must have family access)
GET /api/memories?familyId=xxx&childId=xxx&...
Authorization: Required
Checks: User must be a member of the family if familyId provided
Supports: Pagination, filtering by date/tags

# Get specific memory (must have family access)
GET /api/memories/:id
Authorization: Required
Checks: User must be a member of memory's family

# Update memory (must have family access)
PATCH /api/memories/:id
Authorization: Required
Checks: User must be a member of memory's family

# Delete memory (must have family access)
DELETE /api/memories/:id
Authorization: Required
Checks: User must be a member of memory's family

# React to memory (must have family access)
POST /api/memories/:id/react
Authorization: Required
Body: { emoji }
Checks: User must be a member of memory's family

# Remove reaction (must have family access)
DELETE /api/memories/:id/react
Authorization: Required
Checks: User must be a member of memory's family

# Add comment (must have family access)
POST /api/memories/:id/comment
Authorization: Required
Body: { text }
Checks: User must be a member of memory's family
```

### Storybook Endpoints

```bash
# Generate storybook (must have family access)
POST /api/storybooks/generate
Authorization: Required
Body: { childId, familyId, type, theme, tone, ... }
Checks: User must be a member of the family
Features: AI-powered storybook generation with GPT-5.1 + Gemini

# Get storybooks (must have family access)
GET /api/storybooks?familyId=xxx&childId=xxx
Authorization: Required
Checks: User must be a member of the family

# Get specific storybook (must have family access)
GET /api/storybooks/:id
Authorization: Required
Checks: User must be a member of storybook's family

# Update storybook (must have family access)
PATCH /api/storybooks/:id
Authorization: Required
Checks: User must be a member of storybook's family

# Delete storybook (must have family access)
DELETE /api/storybooks/:id
Authorization: Required
Checks: User must be a member of storybook's family

# Regenerate page (must have family access)
POST /api/storybooks/:id/regenerate-page
Authorization: Required
Checks: User must be a member of storybook's family

# Lock storybook for printing (must have family access)
POST /api/storybooks/:id/lock
Authorization: Required
Checks: User must be a member of storybook's family

# Place print order (must have family access)
POST /api/storybooks/:id/order
Authorization: Required
Checks: User must be a member of storybook's family
```

### Highlights Endpoints

```bash
# Generate highlight manually (must have family access)
POST /api/highlights/generate
Authorization: Required
Body: { type, childId, familyId, month?, year? }
Checks: User must be a member of the family

# Get weekly highlights (must have family access)
GET /api/highlights/weekly?childId=xxx&year=2024
Authorization: Required
Checks: User must be a member of child's family

# Get monthly recaps (must have family access)
GET /api/highlights/monthly?childId=xxx&year=2024
Authorization: Required
Checks: User must be a member of child's family

# Get video reel job status
GET /api/highlights/video-status/:jobId
Authorization: Required
```

### Upload Endpoints

```bash
# Get presigned upload URL (must be authenticated)
POST /api/upload/presigned-url
Authorization: Required
Body: { fileName, fileType, folder? }
Returns: Presigned URL for direct S3 upload
```

---

## 🔒 Authorization Flow

### 1. Authentication Check

```typescript
// Every protected endpoint starts with:
await requireAuth();
const userId = await getCurrentUserId();

if (!userId) {
  return errorResponse('Unauthorized', 401);
}
```

### 2. Family Access Verification

```typescript
// Verify user has access to the family
const { error, family } = await verifyFamilyAccess(familyId, userId);
if (error) return error;

// OR for child-related endpoints:
const { error, child } = await verifyChildAccess(childId, userId);
if (error) return error;
```

### 3. Data Filtering

```typescript
// GET endpoints filter data by user's families
const families = await Family.find({
  'members.userId': userId,  // Only families where user is a member
});
```

---

## 🛠️ Helper Functions

### Session Helpers (`lib/auth/session.ts`)

```typescript
// Get current user (returns null if not authenticated)
const user = await getCurrentUser();

// Get current user's full data from database
const userData = await getCurrentUserData();

// Require authentication (throws error if not authenticated)
const user = await requireAuth();

// Get user ID as ObjectId
const userId = await getCurrentUserId();
```

### Authorization Helpers (`lib/utils/auth-helpers.ts`)

```typescript
// Verify user has access to a family
const { error, family } = await verifyFamilyAccess(familyId, userId);

// Returns:
// - { error: Response, family: null } if access denied
// - { error: null, family: IFamily } if access granted
```

---

## 🔍 Testing Protected Endpoints

### 1. Sign In First

```bash
# Get session cookie
curl -c cookies.txt http://localhost:3000/api/auth/signin/google
# Complete OAuth flow in browser

# Or use the session cookie in requests
curl -b cookies.txt http://localhost:3000/api/auth/me
```

### 2. Test Authorization

```bash
# Valid request (user is family member)
curl -b cookies.txt \
  http://localhost:3000/api/children?familyId=507f1f77bcf86cd799439011

# Returns: 200 OK with children data

# Invalid request (user is NOT family member)
curl -b cookies.txt \
  http://localhost:3000/api/children?familyId=DIFFERENT_FAMILY_ID

# Returns: 403 Forbidden
{
  "success": false,
  "message": "You do not have access to this family"
}
```

### 3. Test Without Authentication

```bash
# Request without session cookie
curl http://localhost:3000/api/children

# Returns: 401 Unauthorized
{
  "success": false,
  "message": "Unauthorized"
}
```

---

## 📊 Response Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Request completed successfully |
| 401 | Unauthorized | No valid session / not authenticated |
| 403 | Forbidden | Authenticated but not authorized for this resource |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error |

---

## 🚨 Security Best Practices

### Implemented

- ✅ **Session-based authentication** using NextAuth
- ✅ **JWT tokens** signed with secret key
- ✅ **Family-based authorization** - users can only access their family's data
- ✅ **Input validation** on all endpoints
- ✅ **Secure cookies** (HttpOnly, Secure, SameSite)
- ✅ **CSRF protection** via NextAuth

### Recommended for Production

- ⚠️ **Rate limiting** - Add rate limits to prevent abuse
- ⚠️ **API key rotation** - Rotate OAuth secrets regularly
- ⚠️ **Audit logging** - Log all data access for compliance
- ⚠️ **IP whitelisting** - Restrict MongoDB Atlas access
- ⚠️ **HTTPS only** - Force HTTPS in production
- ⚠️ **Security headers** - Add helmet.js or similar

---

## 🔄 Migration Notes

### Breaking Changes

**Before:** Endpoints accepted `userId` in query params
```bash
GET /api/families?userId=xxx
```

**After:** User ID is automatically determined from session
```bash
GET /api/families
# Returns only families where authenticated user is a member
```

### Mobile App Updates Required

Mobile apps must:
1. Implement OAuth sign-in flow
2. Store and send session cookies with requests
3. Handle 401 responses by redirecting to login
4. Remove manual `userId` parameters from requests

---

## 📱 Mobile Integration Example

```typescript
// React Native / Expo

import AsyncStorage from '@react-native-async-storage/async-storage';

// Store session after OAuth
await AsyncStorage.setItem('sessionToken', token);

// Make authenticated requests
const response = await fetch('https://api.giggles.com/api/families', {
  credentials: 'include',  // Include cookies
  headers: {
    'Cookie': await AsyncStorage.getItem('sessionToken'),
  },
});

if (response.status === 401) {
  // Redirect to login
  navigation.navigate('SignIn');
}
```

---

**All endpoints are now secure and properly authenticated! 🔒**
