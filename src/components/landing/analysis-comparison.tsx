import { Check, Minus } from "lucide-react";

type Translator = (key: string) => string;

export function AnalysisComparison({ t }: { t: Translator }) {
  const rows = [
    {
      plan: t("common.free"),
      standard: true,
      deep: false,
    },
    {
      plan: t("common.standard"),
      standard: true,
      deep: false,
    },
    {
      plan: `${t("common.plus")} / ${t("common.premium")} / ${t("common.enterprise")}`,
      standard: false,
      deep: true,
    },
  ];

  return (
    <div className="mt-12 max-w-3xl mx-auto overflow-x-auto">
      <h3 className="text-lg font-semibold text-center mb-4">{t("landing.analysisCompareTitle")}</h3>
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted/50">
            <th scope="col" className="text-left p-3 font-medium">
              {t("landing.analysisComparePlanCol")}
            </th>
            <th scope="col" className="p-3 font-medium text-center">
              {t("landing.analysisStandardCol")}
            </th>
            <th scope="col" className="p-3 font-medium text-center">
              {t("landing.analysisDeepCol")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.plan} className="border-t">
              <td className="p-3 text-muted-foreground">{row.plan}</td>
              <td className="p-3 text-center">
                {row.standard ? (
                  <Check className="h-5 w-5 text-primary mx-auto" aria-label={t("landing.included")} />
                ) : (
                  <Minus className="h-5 w-5 text-muted-foreground/40 mx-auto" aria-hidden />
                )}
              </td>
              <td className="p-3 text-center">
                {row.deep ? (
                  <Check className="h-5 w-5 text-primary mx-auto" aria-label={t("landing.included")} />
                ) : (
                  <Minus className="h-5 w-5 text-muted-foreground/40 mx-auto" aria-hidden />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground text-center mt-3">{t("landing.analysisCompareNote")}</p>
    </div>
  );
}
