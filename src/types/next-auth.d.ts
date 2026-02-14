import { SubscriptionTier } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      subscriptionTier: SubscriptionTier;
      locale: string;
    };
  }

  interface User {
    id: string;
    subscriptionTier: SubscriptionTier;
    locale: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscriptionTier: SubscriptionTier;
    locale: string;
  }
}
