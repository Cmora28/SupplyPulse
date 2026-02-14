import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/security";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: Request) {
  try {
    // Rate limit: 3 requests per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration (OWASP A07)
    const successResponse = NextResponse.json({
      message:
        "If an account with that email exists, we've sent a password reset link.",
    });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return successResponse;
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // Send the email
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${APP_URL}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    } catch (emailError) {
      console.error("[ForgotPassword] Email send error:", emailError);
      // Don't expose email failures — still return success
    }

    return successResponse;
  } catch (error) {
    console.error("[ForgotPassword] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
