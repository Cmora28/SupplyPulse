import { Resend } from "resend";
import { format } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

function buildEmailHtml(
  userName: string,
  weekOf: Date,
  supplierCount: number
): string {
  const weekLabel = format(weekOf, "MMMM d, yyyy");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color:#2563eb;padding:32px 24px;text-align:center;">
        <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">
          Supply Pulse
        </h1>
        <p style="color:#bfdbfe;font-size:14px;margin:8px 0 0;">
          Weekly Supply Chain Risk Report
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding:32px 24px;">
        <p style="font-size:16px;color:#111827;margin:0 0 16px;">
          Hi ${userName || "there"},
        </p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">
          Your weekly supply chain risk report for the week of
          <strong>${weekLabel}</strong> is ready.
          We analyzed <strong>${supplierCount} supplier${supplierCount !== 1 ? "s" : ""}</strong>
          and prepared a comprehensive risk assessment.
        </p>

        <!-- Highlights -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-radius:8px;margin:0 0 24px;">
          <tr>
            <td style="padding:20px;">
              <p style="font-size:13px;font-weight:600;color:#1e40af;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">
                Report Highlights
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    Comprehensive risk assessment for each supplier
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    Current disruptions identified in past 7 days
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    Predicted risks for next 30 days
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    Actionable recommendations from AI analysis
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    All findings backed by cited sources
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="font-size:14px;color:#374151;margin:0 0 24px;">
          The full PDF report is attached to this email. You can also view your reports on the dashboard.
        </p>

        <!-- CTA Button -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="background-color:#2563eb;border-radius:6px;">
              <a href="${APP_URL}/dashboard/reports"
                 style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">
                View in Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:24px;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">
          Generated automatically every Monday at 8 AM UTC
        </p>
        <p style="font-size:12px;color:#9ca3af;margin:8px 0 0;text-align:center;">
          Questions? Reply to this email or visit your
          <a href="${APP_URL}/dashboard" style="color:#2563eb;">dashboard</a>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWeeklyReport(
  user: { name: string; email: string },
  pdfBuffer: Buffer,
  weekOf: Date,
  supplierCount: number
): Promise<void> {
  const weekLabel = format(weekOf, "MMMM d, yyyy");
  const filename = `supply-chain-report-${format(weekOf, "yyyy-MM-dd")}.pdf`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: user.email,
    subject: `Weekly Supply Chain Report - ${weekLabel}`,
    html: buildEmailHtml(user.name, weekOf, supplierCount),
    attachments: [
      {
        filename,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
