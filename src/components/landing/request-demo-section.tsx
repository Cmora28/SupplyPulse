import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

type Translator = (key: string) => string;

const DEMO_MAIL =
  "mailto:sales@supplypulse.net?subject=Supply%20Pulse%20demo%20request";

export function RequestDemoSection({ t }: { t: Translator }) {
  return (
    <section
      id="request-demo"
      className="scroll-mt-20 py-16 md:py-20 bg-slate-950 text-white"
      aria-labelledby="request-demo-heading"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 id="request-demo-heading" className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
          {t("landing.demoTitle")}
        </h2>
        <p className="text-slate-300 text-lg leading-relaxed mb-8">{t("landing.demoSubtitle")}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
          <Button size="lg" asChild className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto">
            <a href={DEMO_MAIL}>
              <Mail className="mr-2 h-4 w-4" aria-hidden />
              {t("landing.requestDemo")}
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white sm:w-auto"
          >
            <Link href="/register">
              {t("landing.startFreeMonitoring")}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-6">{t("landing.demoNote")}</p>
      </div>
    </section>
  );
}
