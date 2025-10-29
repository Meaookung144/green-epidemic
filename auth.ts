import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

// LINE provider definition (manual implementation since it's not built-in)
function LINE(options: any) {
  return {
    id: "line",
    name: "LINE",
    type: "oauth",
    authorization: {
      url: "https://access.line.me/oauth2/v2.1/authorize",
      params: {
        scope: "profile openid",
        response_type: "code",
      },
    },
    token: "https://api.line.me/oauth2/v2.1/token",
    userinfo: "https://api.line.me/v2/profile",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    profile(profile: any) {
      return {
        id: profile.userId,
        name: profile.displayName,
        email: null, // LINE doesn't provide email in basic profile
        image: profile.pictureUrl,
      }
    },
    ...options,
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    LINE({
      clientId: process.env.LINE_CHANNEL_ID!,
      clientSecret: process.env.LINE_CHANNEL_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      if (session?.user && user?.id) {
        session.user.id = user.id;
        // Add user role and other data
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, homeLatitude: true, homeLongitude: true, lineId: true }
        });
        if (dbUser) {
          (session.user as any).role = dbUser.role;
          (session.user as any).homeLatitude = dbUser.homeLatitude;
          (session.user as any).homeLongitude = dbUser.homeLongitude;
          (session.user as any).lineId = dbUser.lineId;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (!account) {
        return false;
      }

      // For LINE provider, email is not required
      if (account.provider !== "line" && !user.email) {
        return false;
      }

      if (account.provider === "google") {
        try {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          });

          if (existingUser) {
            // Check if this Google account is already linked to another user
            const googleUser = await prisma.user.findUnique({
              where: { googleId: account.providerAccountId }
            });

            if (googleUser && googleUser.id !== existingUser.id) {
              // This Google account is linked to a different user
              return false;
            }

            // Update existing user with Google ID if not set
            if (!existingUser.googleId) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  googleId: account.providerAccountId,
                  profileImage: user.image || existingUser.profileImage,
                  name: user.name || existingUser.name,
                }
              });
            }
          }
          // If no existing user, NextAuth will create one automatically with the adapter
          return true;
        } catch (error) {
          console.error("Error during sign in:", error);
          return false;
        }
      }

      if (account.provider === "line") {
        try {
          // Check if user already exists with this LINE ID
          const existingLineUser = await prisma.user.findUnique({
            where: { lineId: account.providerAccountId }
          });

          if (existingLineUser) {
            // Update existing user profile
            await prisma.user.update({
              where: { id: existingLineUser.id },
              data: {
                profileImage: user.image || existingLineUser.profileImage,
                name: user.name || existingLineUser.name,
              }
            });
            return true;
          } else {
            // Create new user with LINE ID
            await prisma.user.create({
              data: {
                lineId: account.providerAccountId,
                name: user.name,
                profileImage: user.image,
                role: 'USER'
              }
            });
            return true;
          }
        } catch (error) {
          console.error("Error during LINE sign in:", error);
          return false;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
})