import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Supply Chain Risk Monitoring Plans",
  description:
    "Compare Supply Pulse pricing plans for AI-powered supply chain risk monitoring. Free, Standard ($29/mo), Premium ($199/mo with Deep Research AI), and Enterprise plans. Monitor suppliers, detect disruptions, and receive weekly risk reports.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
