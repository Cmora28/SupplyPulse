import { Resend } from "resend";
import { format } from "date-fns";
import { escapeHtml } from "@/lib/security";
import { createTranslator } from "@/i18n";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
// Use your verified domain in Resend. Set EMAIL_FROM to override (e.g. "Supply Pulse <reports@supplypulse.net>").
const FROM_EMAIL =
  process.env.EMAIL_FROM || "Supply Pulse <reports@supplypulse.net>";

function buildEmailHtml(
  userName: string,
  weekOf: Date,
  supplierCount: number,
  locale: string = "en"
): string {
  const t = createTranslator(locale);
  const weekLabel = format(weekOf, "MMMM d, yyyy");
  const plural = supplierCount !== 1 ? "s" : "";

  return `
<!DOCTYPE html>
<html lang="${locale}">
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
          ${t("email.weeklyReport.subtitle")}
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding:32px 24px;">
        <p style="font-size:16px;color:#111827;margin:0 0 16px;">
          ${t("email.weeklyReport.greeting", { name: escapeHtml(userName || "there") })}
        </p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">
          ${t("email.weeklyReport.intro", { weekLabel, count: String(supplierCount), plural })}
        </p>

        <!-- Highlights -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-radius:8px;margin:0 0 24px;">
          <tr>
            <td style="padding:20px;">
              <p style="font-size:13px;font-weight:600;color:#1e40af;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">
                ${t("email.weeklyReport.highlightsTitle")}
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    ${t("email.weeklyReport.highlight1")}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    ${t("email.weeklyReport.highlight2")}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    ${t("email.weeklyReport.highlight3")}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    ${t("email.weeklyReport.highlight4")}
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;vertical-align:top;">
                    <span style="color:#2563eb;font-size:14px;">&#8226;</span>
                  </td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">
                    ${t("email.weeklyReport.highlight5")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="font-size:14px;color:#374151;margin:0 0 24px;">
          ${t("email.weeklyReport.pdfNote")}
        </p>

        <!-- CTA Button -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="background-color:#2563eb;border-radius:6px;">
              <a href="${APP_URL}/dashboard/reports"
                 style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">
                ${t("email.weeklyReport.viewDashboard")}
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
          ${t("email.weeklyReport.footerGenerated")}
        </p>
        <p style="font-size:12px;color:#9ca3af;margin:8px 0 0;text-align:center;">
          ${t("email.weeklyReport.footerQuestions")}
          <a href="${APP_URL}/dashboard" style="color:#2563eb;">${t("email.weeklyReport.footerDashboard")}</a>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string,
  locale: string = "en"
): Promise<void> {
  const t = createTranslator(locale);
  const safeName = escapeHtml(name || "there");

  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="background-color:#2563eb;padding:32px 24px;text-align:center;">
        <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;">
          Supply Pulse
        </h1>
        <p style="color:#bfdbfe;font-size:14px;margin:8px 0 0;">
          ${t("email.passwordReset.subtitle")}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;">
        <p style="font-size:16px;color:#111827;margin:0 0 16px;">
          ${t("email.passwordReset.greeting", { name: safeName })}
        </p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">
          ${t("email.passwordReset.intro")}
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td style="background-color:#2563eb;border-radius:6px;">
              <a href="${resetUrl}"
                 style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">
                ${t("email.passwordReset.button")}
              </a>
            </td>
          </tr>
        </table>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">
          ${t("email.passwordReset.ignore")}
        </p>
        <p style="font-size:12px;color:#9ca3af;line-height:1.6;margin:16px 0 0;word-break:break-all;">
          ${t("email.passwordReset.copyLink")} ${resetUrl}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">
          ${t("email.passwordReset.footer")}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: t("email.passwordReset.subject"),
    html,
  });

  if (error) {
    console.error("Password reset email error:", error);
    throw new Error(`Failed to send reset email: ${error.message}`);
  }
}

export async function sendWeeklyReport(
  user: { name: string; email: string },
  pdfBuffer: Buffer,
  weekOf: Date,
  supplierCount: number,
  locale: string = "en"
): Promise<void> {
  const t = createTranslator(locale);
  const weekLabel = format(weekOf, "MMMM d, yyyy");
  const filename = `supply-chain-report-${format(weekOf, "yyyy-MM-dd")}.pdf`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: user.email,
    subject: t("email.weeklyReport.subject", { weekLabel }),
    html: buildEmailHtml(user.name, weekOf, supplierCount, locale),
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

export async function sendP1Alert(input: {
  user: { name: string; email: string };
  supplierName: string;
  weekOf: Date;
  riskScore: number | null;
  riskFactors: string[];
  previousPriority: "P1" | "P2" | "P3" | null;
  previousScore: number | null;
  locale?: string;
}): Promise<void> {
  const locale = input.locale || "en";
  const t = createTranslator(locale);
  const supplier = input.supplierName.replace(/[\r\n]+/g, " ").trim().slice(0, 160);
  const safeSupplier = escapeHtml(supplier);
  const weekLabel = format(input.weekOf, "MMMM d, yyyy");
  const factors = input.riskFactors.filter((factor) => factor.trim()).slice(0, 3);

  let intro = t("email.p1Alert.intro", { supplier: safeSupplier, weekLabel });
  if (input.previousPriority && input.previousPriority !== "P1") {
    intro = t("email.p1Alert.escalated", {
      supplier: safeSupplier,
      weekLabel,
      previous: input.previousPriority,
    });
  } else if (input.previousPriority === "P1") {
    intro = t("email.p1Alert.remains", { supplier: safeSupplier, weekLabel });
  }

  const delta =
    input.riskScore != null && input.previousScore != null
      ? input.riskScore - input.previousScore
      : null;
  const deltaLabel =
    delta == null
      ? ""
      : delta === 0
        ? t("email.p1Alert.scoreUnchanged")
        : t("email.p1Alert.scoreChange", {
            delta: delta > 0 ? `+${delta}` : String(delta),
          });

  const factorRows = factors
    .map(
      (factor) => `<tr>
                  <td style="padding:4px 0;vertical-align:top;color:#b91c1c;font-size:14px;">&#8226;</td>
                  <td style="padding:4px 0 4px 8px;font-size:13px;color:#374151;">${escapeHtml(factor)}</td>
                </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="background-color:#dc2626;padding:28px 24px;text-align:center;">
        <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Supply Pulse</h1>
        <p style="color:#fecaca;font-size:14px;margin:8px 0 0;">${t("email.p1Alert.subtitle")}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;">
        <p style="font-size:16px;color:#111827;margin:0 0 16px;">
          ${t("email.p1Alert.greeting", { name: escapeHtml(input.user.name || "there") })}
        </p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">${intro}</p>
        ${
          input.riskScore != null
            ? `<p style="font-size:14px;color:#111827;font-weight:600;margin:0 0 8px;">${t("email.p1Alert.score", { score: input.riskScore })}</p>`
            : ""
        }
        ${
          deltaLabel
            ? `<p style="font-size:13px;color:#374151;margin:0 0 16px;">${deltaLabel}</p>`
            : ""
        }
        ${
          factors.length
            ? `<p style="font-size:13px;font-weight:600;color:#991b1b;margin:0 0 8px;">${t("email.p1Alert.factorsTitle")}</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${factorRows}</table>`
            : ""
        }
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px;">${t("email.p1Alert.action")}</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
          <tr>
            <td style="background-color:#dc2626;border-radius:6px;">
              <a href="${APP_URL}/dashboard/suppliers" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">
                ${t("email.p1Alert.viewDashboard")}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;border-top:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center;">${t("email.p1Alert.footer")}</p>
        <p style="font-size:12px;color:#9ca3af;margin:8px 0 0;text-align:center;">
          <a href="${APP_URL}/dashboard/settings" style="color:#2563eb;">${t("email.p1Alert.settings")}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: input.user.email,
    subject: t("email.p1Alert.subject", { supplier, weekLabel }),
    html,
  });

  if (error) {
    console.error("Resend P1 alert error:", error);
    throw new Error(`Failed to send P1 alert: ${error.message}`);
  }
}
