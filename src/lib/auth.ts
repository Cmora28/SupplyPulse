import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SubscriptionTier } from "@prisma/client";
import { AuditAction } from "@prisma/client";
import { logAudit } from "@/lib/audit";
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
          void logAudit({
            action: AuditAction.LOGIN_FAILURE,
            success: false,
            actorEmail: email,
          });
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          void logAudit({
            action: AuditAction.LOGIN_FAILURE,
            success: false,
            actorUserId: user.id,
            actorEmail: email,
          });
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
          locale: user.locale,
          isAdmin: user.isAdmin,
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
        token.isAdmin = (user as unknown as { isAdmin?: boolean }).isAdmin === true;
      }

      // Always refresh subscription tier, locale, and admin from DB.
      // isAdmin on the token is a copy of User.isAdmin, not an email compare.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionTier: true, locale: true, isAdmin: true },
        });
        if (dbUser) {
          token.subscriptionTier = dbUser.subscriptionTier;
          token.locale = dbUser.locale;
          token.isAdmin = dbUser.isAdmin;
        } else {
          token.isAdmin = false;
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
        session.user.isAdmin = token.isAdmin === true;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      void logAudit({
        action: AuditAction.LOGIN_SUCCESS,
        actorUserId: user.id,
        actorEmail: user.email ?? undefined,
      });
    },
    async signOut({ token }) {
      void logAudit({
        action: AuditAction.LOGOUT,
        actorUserId: (token?.id as string) ?? undefined,
        actorEmail: (token?.email as string) ?? undefined,
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
