import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";
import { rateLimit, getClientIp, escapeHtml } from "@/lib/security";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.EMAIL_FROM || "Supply Pulse <reports@supplypulse.net>";
const SUPPORT_EMAIL = "support@supplypulse.net";

const supportSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 3 support tickets per hour per user
    const rateLimitKey = `support:${session.user.id}`;
    const rl = rateLimit(rateLimitKey, 3, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = supportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { subject, message } = parsed.data;
    const userName = session.user.name || "Unknown";
    const userEmail = session.user.email || "unknown@email.com";
    const userTier = session.user.subscriptionTier || "FREE";
    const clientIp = getClientIp(req);

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:20px;background:#f9fafb;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#2563eb;padding:20px 24px;">
      <h1 style="color:#fff;font-size:18px;margin:0;">Support Request</h1>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;font-weight:600;">From:</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;">${escapeHtml(userName)} &lt;${escapeHtml(userEmail)}&gt;</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;font-weight:600;">Plan:</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;">${escapeHtml(userTier)}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;font-weight:600;">IP:</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;">${escapeHtml(clientIp)}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;font-weight:600;">Subject:</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${escapeHtml(subject)}</td>
        </tr>
      </table>
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
        <p style="font-size:13px;color:#6b7280;margin:0 0 8px;font-weight:600;">Message:</p>
        <div style="font-size:14px;color:#111827;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</div>
      </div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#f9fafb;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">Reply directly to this email to respond to the user.</p>
    </div>
  </div>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_EMAIL,
      replyTo: userEmail,
      subject: `[Support] ${subject}`,
      html,
    });

    if (error) {
      console.error("Support email error:", error);
      return NextResponse.json(
        { error: "Failed to send support request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Support route error:", error);
    return NextResponse.json(
      { error: "Failed to send support request" },
      { status: 500 }
    );
  }
}
