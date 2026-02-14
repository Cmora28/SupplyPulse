import { SubscriptionTier } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      subscriptionTier: SubscriptionTier;
    };
  }

  interface User {
    id: string;
    subscriptionTier: SubscriptionTier;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscriptionTier: SubscriptionTier;
  }
}
