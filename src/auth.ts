import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Temporarily disable adapter for OAuth to prevent account linking
  adapter: undefined, // We'll handle account linking manually
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // Only force account selection, not consent for returning users
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
          include_granted_scopes: "true",
        },
      },
      // Override profile to ensure fresh data
      profile(profile) {
        // Handle Google profile picture URL properly
        let profileImage = profile.picture;
        if (profileImage) {
          // Ensure Google profile picture URL has proper size parameter
          if (profileImage.includes('googleusercontent.com') && !profileImage.includes('s=')) {
            profileImage = profileImage.replace(/s\d+/, '') + '?s=200';
          }
          // Remove any existing size parameters and add our own
          if (profileImage.includes('googleusercontent.com')) {
            profileImage = profileImage.split('?')[0] + '?s=200';
          }
        }

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profileImage,
          emailVerified: profile.email_verified ? new Date() : null,
          isVerified: profile.email_verified || false,
        }
      },
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValidPassword) {
          return null;
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          image: user.image, // Include image for credentials users
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth providers, completely override the user with profile data
      if (account?.provider === "google" || account?.provider === "github") {
        if (!profile?.email) {
          return false;
        }

        // CRITICAL: Force the user object to match the OAuth profile
        // This is the most important step - we replace ALL user data
        user.id = user.id; // Keep the existing/new user ID 
        user.email = profile.email;
        user.name = profile.name;

        // Handle profile picture with proper formatting
        let profileImage = profile.picture;
        if (profileImage && profileImage.includes('googleusercontent.com')) {
          // Ensure proper size parameter for Google images
          profileImage = profileImage.split('?')[0] + '?s=200';
        }
        user.image = profileImage;

        // Also try to update the database with the correct data
        try {
          // Use the same image URL formatting
          let profileImage = profile.picture;
          if (profileImage && profileImage.includes('googleusercontent.com')) {
            profileImage = profileImage.split('?')[0] + '?s=200';
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              email: profile.email,
              name: profile.name,
              image: profileImage,
              lastLogin: new Date(),
            },
          });
        } catch (error) {
          // Continue anyway - the user object changes should still work
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session, profile }) {
      // On sign in with OAuth - this should happen for fresh OAuth logins
      if (user && account) {
        // For OAuth providers, ALWAYS use profile data as the absolute source of truth
        if (account?.provider === "google" || account?.provider === "github") {
          if (profile?.email) {

            // Create or update user in database with profile data
            try {
              let dbUser = await prisma.user.findUnique({
                where: { email: profile.email }
              });

              if (!dbUser) {
                // Create new user with profile data
                // Handle profile picture URL formatting
                let profileImage = profile.picture;
                if (profileImage && profileImage.includes('googleusercontent.com')) {
                  profileImage = profileImage.split('?')[0] + '?s=200';
                }

                dbUser = await prisma.user.create({
                  data: {
                    email: profile.email,
                    name: profile.name,
                    image: profileImage,
                    isVerified: true, // OAuth users are verified
                    lastLogin: new Date(),
                  }
                });
              } else {
                // Update existing user with fresh profile data
                // Handle profile picture URL formatting
                let profileImage = profile.picture;
                if (profileImage && profileImage.includes('googleusercontent.com')) {
                  profileImage = profileImage.split('?')[0] + '?s=200';
                }

                dbUser = await prisma.user.update({
                  where: { email: profile.email },
                  data: {
                    name: profile.name,
                    image: profileImage,
                    lastLogin: new Date(),
                  }
                });
              }

              // Set token with database user data (which now has correct profile data)
              token.id = dbUser.id;
              token.email = dbUser.email;   // This should now be the correct email
              token.name = dbUser.name;
              token.isVerified = dbUser.isVerified;
              token.provider = account.provider;

              if (dbUser.image) {
                token.picture = dbUser.image;
              }
            } catch (error) {
              // Fallback to profile data directly
              token.email = profile.email;
              token.name = profile.name;
              token.isVerified = true;
              token.provider = account.provider;
              if (profile.picture) {
                token.picture = profile.picture;
              }
            }
          } else {
            if (user.id) {
              token.id = user.id;
            }
            token.email = user.email;
            token.name = user.name;
            token.isVerified = user.isVerified;
            token.provider = account.provider;

            if (user.image) {
              token.picture = user.image;
            }
          }
        } else {
          // For non-OAuth providers (credentials), use user data
          if (user.id) {
            token.id = user.id;
          }
          token.email = user.email;
          token.name = user.name;
          token.isVerified = user.isVerified;
          token.provider = account.provider;

          if (user.image) {
            token.picture = user.image;
          }
        }
      }
      // Handle session updates
      else if (trigger === "update" && session) {
        token.isVerified = session.isVerified;
      }
      // Refresh user data periodically (but not for fresh OAuth logins)
      else if (token.id && !user && !account) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
          });
          if (dbUser) {
            token.isVerified = dbUser.isVerified;
            // Don't overwrite email/name for existing tokens unless explicitly updated
            if (dbUser.image) {
              token.picture = dbUser.image;
            }
          } else {
            // Clear invalid token if user not found
            return null;
          }
        } catch (error) {
          return null; // Clear token on error
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.isVerified = token.isVerified as boolean;
        session.user.provider = token.provider as string;
        // Pass the image from token to session
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
})