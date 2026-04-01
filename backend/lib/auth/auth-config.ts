import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/db/mongodb-adapter';
import { User } from '@/lib/db/models';
import { Types } from 'mongoose';

/**
 * NextAuth configuration
 * Handles Google and Apple OAuth authentication
 */
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: process.env.APPLE_CLIENT_SECRET || '',
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 Sign in attempt:', {
        email: user.email,
        provider: account?.provider,
      });

      // Ensure user exists in our User collection
      if (user.email && account) {
        try {
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // Create new user in our schema
            await User.create({
              _id: new Types.ObjectId(user.id),
              email: user.email,
              name: user.name || 'User',
              avatar: user.image || undefined,
              authProvider: account.provider as 'google' | 'apple',
              providerAccountId: account.providerAccountId,
            });
            console.log('✅ New user created:', user.email);
          } else {
            console.log('✅ Existing user signed in:', user.email);
          }
        } catch (error) {
          console.error('❌ Error in signIn callback:', error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email || '';
        token.name = user.name || '';
        token.picture = user.image || '';

        if (account) {
          token.provider = account.provider;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Add custom fields to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Redirect to app after sign in
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  events: {
    async signIn({ user, account }) {
      console.log(`✅ User ${user.email} signed in with ${account?.provider}`);
    },
    async signOut({ token }) {
      console.log(`👋 User signed out: ${token?.email}`);
    },
  },

  debug: process.env.NODE_ENV === 'development',
};
