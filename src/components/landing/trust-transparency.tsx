import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Brain, Eye, Layers } from "lucide-react";

type Translator = (key: string) => string;

export function TrustTransparency({ t }: { t: Translator }) {
  const items = [
    {
      icon: Eye,
      title: t("landing.trustCard1Title"),
      body: t("landing.trustCard1Body"),
    },
    {
      icon: Layers,
      title: t("landing.trustCard2Title"),
      body: t("landing.trustCard2Body"),
    },
    {
      icon: Brain,
      title: t("landing.trustCard3Title"),
      body: t("landing.trustCard3Body"),
    },
    {
      icon: BookOpen,
      title: t("landing.trustCard4Title"),
      body: t("landing.trustCard4Body"),
    },
  ];

  return (
    <section className="py-20 md:py-24 bg-background" aria-labelledby="trust-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/5">
            {t("landing.trustLabel")}
          </Badge>
          <h2 id="trust-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {t("landing.trustTitle")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{t("landing.trustSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item, i) => (
            <Card key={i} className="border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground text-center max-w-3xl mx-auto leading-relaxed">
          {t("landing.trustDisclaimer")}
        </p>
      </div>
    </section>
  );
}
