import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SubscriptionTier } from "@prisma/client";
import { rateLimit } from "@/lib/security";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // A04: Rate limit login — 10 attempts per 15 minutes per email
        const email = credentials.email.toLowerCase().trim();
        const rl = rateLimit(`login:${email}`, 10, 15 * 60 * 1000);
        if (!rl.success) {
          throw new Error(
            "Too many login attempts. Please try again in a few minutes."
          );
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          // A07: Use same error for missing user and wrong password (timing-safe)
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
          locale: user.locale,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // A07: Reduced to 7 days (was 30)
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.subscriptionTier = (
          user as unknown as { subscriptionTier: SubscriptionTier }
        ).subscriptionTier;
        token.locale = (user as unknown as { locale: string }).locale;
      }

      // Always refresh subscription tier and locale from DB
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionTier: true, locale: true },
        });
        if (dbUser) {
          token.subscriptionTier = dbUser.subscriptionTier;
          token.locale = dbUser.locale;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { id: string }).id = token.id as string;
        (
          session.user as unknown as { subscriptionTier: SubscriptionTier }
        ).subscriptionTier = token.subscriptionTier as SubscriptionTier;
        (session.user as unknown as { locale: string }).locale =
          (token.locale as string) || "en";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
