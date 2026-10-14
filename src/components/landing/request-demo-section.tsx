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
          <a href={DEMO_MAIL} className="inline-flex">
            <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              <Mail className="mr-2 h-4 w-4" aria-hidden />
              {t("landing.requestDemo")}
            </Button>
          </a>
          <Link href="/register" className="inline-flex">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white"
            >
              {t("landing.startFreeMonitoring")}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-6">{t("landing.demoNote")}</p>
      </div>
    </section>
  );
}
