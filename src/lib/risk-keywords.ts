/**
 * Keyword gate before JEV. No model call. Tuned so routine corporate,
 * product, and markets headlines (the Oct 2026 sample) do not pass, while
 * shutdowns, strikes, attacks, and recalls do.
 * Non-English tokens cover the product locales (pt, es, fr, de) at headline level.
 */

const PHRASES = [
  "shut down",
  "shuts down",
  "shut-down",
  "plant shutdown",
  "factory shutdown",
  "walk out",
  "industrial action",
  "labor action",
  "labour action",
  "factory fire",
  "plant fire",
  "cyber attack",
  "cyber-attack",
  "port closure",
  "port closed",
  "ports closed",
  "route closure",
  "force majeure",
  "halt production",
  "halted production",
  "production halt",
  "stops production",
  "stopped production",
  "suspends production",
  "suspended production",
  "production suspended",
  "plant closure",
  "factory closure",
  "closes plant",
  "closed plant",
  "closing plant",
  "supply disruption",
  "supply-chain disruption",
  "supply chain disruption",
  "red sea",
  "debt default",
  "defaults on",
  "power outage",
  "export ban",
];

const WORDS = [
  "shutdown",
  "strike",
  "walkout",
  "explosion",
  "exploded",
  "blaze",
  "insolvency",
  "insolvent",
  "bankruptcy",
  "bankrupt",
  "liquidation",
  "sanction",
  "sanctions",
  "embargo",
  "cyberattack",
  "ransomware",
  "recall",
  "recalled",
  "flood",
  "floods",
  "flooding",
  "earthquake",
  "tsunami",
  "hurricane",
  "typhoon",
  "outage",
  "contamination",
  "seizure",
  "seized",
  "blockade",
  "attack",
  "attacks",
  "suspends",
  "suspended",
  "halt",
  "halted",
  "disruption",
  "disruptions",
  "disrupts",
  "fire",
  "wildfire",
  "layoff",
  "layoffs",
  // pt
  "greve",
  "falencia",
  "insolvencia",
  "incendio",
  "inundacao",
  "terramoto",
  "sancao",
  "sancoes",
  // es
  "huelga",
  "quiebra",
  "incendio",
  "inundacion",
  "terremoto",
  "sancion",
  "ciberataque",
  // fr
  "greve",
  "faillite",
  "incendie",
  "inondation",
  "seisme",
  "cyberattaque",
  // de
  "streik",
  "insolvenz",
  "sanktion",
  "cyberangriff",
  "erdbeben",
  "uberschwemmung",
  "ruckruf",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchesRiskKeyword(text: string): boolean {
  const haystack = fold(text);
  for (const phrase of PHRASES) {
    if (haystack.includes(phrase)) return true;
  }
  for (const word of WORDS) {
    const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
    if (re.test(haystack)) return true;
  }
  return false;
}
