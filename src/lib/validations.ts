import { z } from "zod";

// OWASP A07: Strong password policy
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character"
  );

// Sanitize strings: trim whitespace, collapse multiple spaces
const sanitizedString = (maxLen: number) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .transform((s) => s.replace(/\s+/g, " "));

export const registerSchema = z.object({
  name: sanitizedString(100).pipe(z.string().min(1, "Name is required")),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: passwordSchema,
  locale: z.enum(["en", "es", "pt", "fr", "de"]).optional().default("en"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required").max(128),
});

export const supplierSchema = z.object({
  name: sanitizedString(200).pipe(
    z.string().min(1, "Supplier name is required")
  ),
  country: sanitizedString(100).pipe(z.string().min(1, "Country is required")),
  category: sanitizedString(200).pipe(
    z.string().min(1, "Product category is required")
  ),
  leadTimeDays: z
    .number()
    .int()
    .min(1, "Lead time must be at least 1 day")
    .max(3650, "Lead time is too large"),
  cogsPercentage: z
    .number()
    .min(0)
    .max(100, "COGS must be between 0 and 100"),
  shippingRoute: sanitizedString(500).optional().nullable(),
  dependencies: sanitizedString(2000).optional().nullable(),
});

export const updateProfileSchema = z.object({
  name: sanitizedString(100).pipe(z.string().min(1, "Name is required")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: passwordSchema,
});

export const notificationSchema = z.object({
  emailNotifications: z.boolean(),
});

// Route param validation
export const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, "Invalid ID format");
