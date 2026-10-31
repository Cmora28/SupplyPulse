import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { CookieBanner } from "@/components/cookie-banner";
import { MetaPixel } from "@/components/meta-pixel";
import { getServerLocale } from "@/i18n";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://supplypulse.net";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Supply Pulse - AI-Powered Supply Chain Risk Monitoring",
    template: "%s | Supply Pulse",
  },
  description:
    "Monitor supply chain risks with AI-powered weekly reports. Detect disruptions, assess supplier risks, and receive actionable intelligence with cited sources. Free plan available.",
  keywords: [
    "supply chain risk",
    "supply chain disruption monitoring",
    "AI supply chain reports",
    "supplier risk assessment",
    "supply chain risk management",
    "supply chain intelligence",
    "supplier monitoring",
    "supply chain disruption",
    "supply chain visibility",
    "AI risk analysis",
  ],
  authors: [{ name: "Supply Pulse" }],
  creator: "Supply Pulse",
  publisher: "Supply Pulse",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "Supply Pulse",
    title: "Supply Pulse - AI-Powered Supply Chain Risk Monitoring",
    description:
      "Monitor supply chain risks with AI-powered weekly reports. Detect disruptions, assess supplier risks, and receive actionable intelligence with cited sources.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Supply Pulse - AI-Powered Supply Chain Risk Monitoring",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Supply Pulse - AI-Powered Supply Chain Risk Monitoring",
    description:
      "Monitor supply chain risks with AI-powered weekly reports. Detect disruptions, assess supplier risks, and receive actionable intelligence.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: APP_URL,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Supply Pulse",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://supplypulse.net",
  logo: `${process.env.NEXT_PUBLIC_APP_URL || "https://supplypulse.net"}/og-image.png`,
  description:
    "AI-powered supply chain risk monitoring platform that generates weekly risk reports with cited sources and actionable intelligence.",
  foundingDate: "2025",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    email: "sales@supplypulse.net",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getServerLocale(await cookies(), await headers());

  return (
    <html lang={locale}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers locale={locale}>
          {children}
          <Toaster />
          <CookieBanner />
          <MetaPixel />
        </Providers>
      </body>
    </html>
  );
}
