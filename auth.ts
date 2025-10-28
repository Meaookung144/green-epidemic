import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

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
  ],
  callbacks: {
    async session({ session, token, user }) {
      if (session?.user && user?.id) {
        session.user.id = user.id;
        // Add user role and other data
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, homeLatitude: true, homeLongitude: true }
        });
        if (dbUser) {
          (session.user as any).role = dbUser.role;
          (session.user as any).homeLatitude = dbUser.homeLatitude;
          (session.user as any).homeLongitude = dbUser.homeLongitude;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (!account || !user.email) {
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