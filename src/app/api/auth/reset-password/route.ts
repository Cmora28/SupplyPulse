import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/security";
import { z } from "zod";

export const dynamic = "force-dynamic";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Must contain a special character");

const schema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { token, password } = parsed.data;

    // Find user with this token that hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Hash new password and clear the reset token
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      message: "Password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
