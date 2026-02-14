import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(200),
  country: z.string().min(1, "Country is required"),
  category: z.string().min(1, "Product category is required").max(200),
  leadTimeDays: z.number().int().min(1, "Lead time must be at least 1 day"),
  cogsPercentage: z.number().min(0).max(100, "COGS must be between 0 and 100"),
  shippingRoute: z.string().max(500).optional().nullable(),
  dependencies: z.string().max(2000).optional().nullable(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const notificationSchema = z.object({
  emailNotifications: z.boolean(),
});
