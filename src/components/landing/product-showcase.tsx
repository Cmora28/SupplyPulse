import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Link2, ShieldAlert, LayoutDashboard } from "lucide-react";

type Translator = (key: string) => string;

export function ProductShowcase({ t }: { t: Translator }) {
  const highlights = [
    { icon: ShieldAlert, text: t("landing.productHighlight1") },
    { icon: Link2, text: t("landing.productHighlight2") },
    { icon: LayoutDashboard, text: t("landing.productHighlight3") },
  ];

  return (
    <section
      className="py-20 md:py-24 bg-muted/20 border-b"
      aria-labelledby="product-showcase-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/5">
            {t("landing.productShowcaseLabel")}
          </Badge>
          <h2
            id="product-showcase-heading"
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground"
          >
            {t("landing.productShowcaseTitle")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t("landing.productShowcaseSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
              <Image
                src="/landing-preview.png"
                alt={t("landing.productDashboardAlt")}
                width={1200}
                height={750}
                className="w-full h-auto"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center lg:text-left">
              {t("landing.productScreenshotCaption")}
            </p>
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            <ul className="space-y-4">
              {highlights.map((item, i) => (
                <li key={i} className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <p className="text-muted-foreground leading-relaxed pt-1.5">{item.text}</p>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              <a href="#sample-report" className="text-primary font-medium hover:underline">
                {t("landing.viewSampleReport")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
