import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { rateLimit, getClientIp } from "@/lib/security";
import { calculateNextReportAt } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // A04: Rate limit registration — 5 attempts per 15 minutes per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 60000) / 1000)) },
        }
      );
    }

    const body = await request.json();

    // Verify Cloudflare Turnstile token before any processing
    const captchaToken = body?.captchaToken;
    if (!captchaToken) {
      return NextResponse.json(
        { error: "CAPTCHA verification required." },
        { status: 400 }
      );
    }
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: captchaToken,
        }),
      }
    );
    const verifyData = await verifyRes.json() as { success: boolean };
    if (!verifyData.success) {
      return NextResponse.json(
        { error: "CAPTCHA verification failed. Please try again." },
        { status: 400 }
      );
    }

    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, locale, reportDay, reportHour } = validated.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // A07: Return same response shape to prevent email enumeration.
      // Spend time hashing to keep response timing consistent.
      await bcrypt.hash(password, 12);
      return NextResponse.json(
        { message: "Account created successfully" },
        { status: 201 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const day = reportDay ?? 1;
    const hour = reportHour ?? 8;
    const nextReportAt = calculateNextReportAt(day, hour);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        locale: locale || "en",
        reportDay: day,
        reportHour: hour,
        nextReportAt,
      },
    });

    return NextResponse.json(
      { message: "Account created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
