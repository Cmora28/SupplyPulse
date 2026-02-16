export function TrustBar() {
  const companies = [
    "ACME Logistics",
    "GlobalFreight",
    "TechParts Inc.",
    "AutoMotive Systems",
    "PharmaChain",
    "ConstructCo"
  ];

  return (
    <div className="border-y bg-muted/30 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground mb-6">
          TRUSTED BY MODERN SUPPLY CHAIN TEAMS
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-50 grayscale hover:opacity-80 transition-opacity duration-500">
          {companies.map((company) => (
            <div key={company} className="text-xl font-bold flex items-center gap-2">
              <div className="h-6 w-6 bg-current rounded-sm opacity-20" />
              <span>{company}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
