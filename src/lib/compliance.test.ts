import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import de from "../i18n/translations/de";
import en from "../i18n/translations/en";
import es from "../i18n/translations/es";
import fr from "../i18n/translations/fr";
import pt from "../i18n/translations/pt";
import { STARTUP_SQL_FILES } from "./apply-sql";
import {
  COOKIE_CONSENT_DENIED,
  COOKIE_CONSENT_KEY,
  grantCookieConsent,
  hasCookieConsent,
  rejectCookieConsent,
  shouldLoadMetaPixel,
} from "./cookie-consent";
import { TERMS_VERSION, termsAcceptanceData, termsConsentRejection } from "./terms";
import { registerSchema } from "./validations";

const validRegistration = {
  name: "Ada Lovelace",
  email: "ADA@example.com",
  password: "Sup3r!pass",
  termsAccepted: true,
};

function withConsentWindow(run: (store: Map<string, string>) => void) {
  const store = new Map<string, string>();
  const listeners = new Map<string, Set<(event: Event) => void>>();
  const fake = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size;
      },
    },
    dispatchEvent(event: Event) {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    addEventListener(type: string, listener: (event: Event) => void) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type: string, listener: (event: Event) => void) {
      listeners.get(type)?.delete(listener);
    },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: fake,
  });
  try {
    run(store);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

describe("register rejects without consent", () => {
  it("rejects a registration that does not accept the terms", () => {
    for (const termsAccepted of [undefined, false, "true", 1, null]) {
      const decision = termsConsentRejection(termsAccepted);
      assert.ok(decision);
      assert.equal(decision.status, 400);
      assert.match(decision.error, /Terms of Service and Privacy Policy/);

      const parsed = registerSchema.safeParse({ ...validRegistration, termsAccepted });
      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.match(
          parsed.error.issues.map((issue) => issue.message).join(" "),
          /Terms of Service and Privacy Policy/
        );
      }
    }

    assert.equal(termsConsentRejection(true), null);
    const accepted = registerSchema.safeParse(validRegistration);
    assert.equal(accepted.success, true);

    const route = readFileSync(
      new URL("../app/api/auth/register/route.ts", import.meta.url),
      "utf8"
    );
    assert.match(route, /termsConsentRejection\(body\?\.termsAccepted\)/);
    assert.match(route, /status: consent\.status/);
    assert.match(route, /termsAcceptedAt: acceptance\.termsAcceptedAt/);
    assert.match(route, /termsVersion: acceptance\.termsVersion/);

    const recorded = termsAcceptanceData(new Date("2026-10-31T12:00:00.000Z"));
    assert.equal(recorded.termsVersion, TERMS_VERSION);
    assert.equal(TERMS_VERSION, "2026-10-31");
    assert.equal(recorded.termsAcceptedAt.toISOString(), "2026-10-31T12:00:00.000Z");
  });

  it("keeps terms columns nullable so existing users stay null", () => {
    assert.equal(
      STARTUP_SQL_FILES.some((file) => file.endsWith("20261031_user_terms_consent.sql")),
      true
    );
    for (const relative of [
      "../../prisma/sql/20261031_user_terms_consent.sql",
      "../../prisma/migrations/20261031220000_user_terms_consent/migration.sql",
    ]) {
      const sql = readFileSync(new URL(relative, import.meta.url), "utf8");
      const alters = sql.split("\n").filter((line) => line.startsWith("ALTER TABLE"));
      assert.deepEqual(
        alters.map((line) => line.trim()),
        [
          'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);',
          'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;',
        ]
      );
      for (const line of alters) {
        assert.equal(line.includes("NOT NULL"), false);
        assert.equal(line.includes("DEFAULT"), false);
      }
    }
  });
});

describe("consent rejection prevents pixel load", () => {
  it("does not allow the Meta Pixel after Reject", () => {
    withConsentWindow((store) => {
      assert.equal(shouldLoadMetaPixel(), false);
      assert.equal(hasCookieConsent(), false);

      grantCookieConsent();
      assert.equal(shouldLoadMetaPixel(), true);

      rejectCookieConsent();
      assert.equal(store.get(COOKIE_CONSENT_KEY), COOKIE_CONSENT_DENIED);
      assert.equal(hasCookieConsent(), false);
      assert.equal(shouldLoadMetaPixel(), false);

      store.set(COOKIE_CONSENT_KEY, "true");
      assert.equal(shouldLoadMetaPixel(), true);
      rejectCookieConsent();
      assert.equal(shouldLoadMetaPixel(), false);
    });

    const pixel = readFileSync(
      new URL("../components/meta-pixel.tsx", import.meta.url),
      "utf8"
    );
    assert.match(pixel, /const allowed = shouldLoadMetaPixel\(\)/);
    assert.match(pixel, /if \(!enabled\) return null/);
    assert.match(pixel, /connect\.facebook\.net/);
    const banner = readFileSync(
      new URL("../components/cookie-banner.tsx", import.meta.url),
      "utf8"
    );
    assert.equal((banner.match(/variant="default"/g) ?? []).length, 2);
    assert.match(banner, /rejectCookieConsent\(\)/);
    assert.match(banner, /grantCookieConsent\(\)/);
  });
});

describe("legal copy", () => {
  const copies = { en, pt, es, fr, de };

  it("states the business-only clause, Portuguese law, and the liability carve-out", () => {
    assert.match(en.legal.termsBusinessOnly, /exclusively for businesses and professionals, not consumers/);
    assert.match(en.legal.termsBusinessOnly, /Whoever registers declares/);
    assert.match(pt.legal.termsBusinessOnly, /exclusivamente a empresas e profissionais/);
    assert.match(pt.legal.termsBusinessOnly, /não a consumidores/);
    assert.match(es.legal.termsBusinessOnly, /no a consumidores/);
    assert.match(fr.legal.termsBusinessOnly, /non aux consommateurs/);
    assert.match(de.legal.termsBusinessOnly, /nicht an Verbraucher/);

    assert.equal(pt.legal.termsGoverning, "Regidos pela lei portuguesa; foro da comarca de Lisboa.");
    assert.match(en.legal.termsGoverning, /Portuguese law/);
    assert.match(en.legal.termsGoverning, /Lisbon/);
    assert.match(es.legal.termsGoverning, /ley portuguesa/);
    assert.match(es.legal.termsGoverning, /Lisboa/);
    assert.match(fr.legal.termsGoverning, /loi portugaise/);
    assert.match(fr.legal.termsGoverning, /Lisbonne/);
    assert.match(de.legal.termsGoverning, /portugiesisches Recht/);
    assert.match(de.legal.termsGoverning, /Lissabon/);

    assert.match(en.legal.termsLiability, /willful misconduct or gross negligence/);
    assert.match(pt.legal.termsLiability, /salvo dolo ou culpa grave/);
    assert.match(es.legal.termsLiability, /salvo dolo o culpa grave/);
    assert.match(fr.legal.termsLiability, /sauf dol ou faute grave/);
    assert.match(de.legal.termsLiability, /Vorsatz oder grober Fahrlässigkeit/);

    assert.equal(en.legal.updatedDate, "31 October 2026");
    assert.equal(pt.legal.updatedDate, "31 de outubro de 2026");
    assert.equal(es.legal.updatedDate, "31 de octubre de 2026");
    assert.equal(fr.legal.updatedDate, "31 octobre 2026");
    assert.equal(de.legal.updatedDate, "31. Oktober 2026");
  });

  it("names the processors, US transfer tools, and the CNPD", () => {
    for (const copy of Object.values(copies)) {
      assert.match(copy.legal.privacyThirdParty1, /Perplexity/);
      assert.match(copy.legal.privacyThirdParty2, /Resend/);
      assert.match(copy.legal.privacyThirdParty3, /Polar/);
      assert.match(copy.legal.privacyThirdParty4, /Meta/);
      assert.match(copy.legal.processorData, /Redis/);
      assert.match(copy.legal.processorTurnstile, /Turnstile/);
      assert.match(copy.legal.privacyInternational, /EU-US Data Privacy Framework/);
      assert.match(copy.legal.privacyInternational, /Standard Contractual Clauses/);
      assert.match(copy.legal.privacyRight5, /CNPD/);
      assert.match(copy.legal.privacyRight5, /Comissão Nacional de Proteção de Dados/);
      assert.equal(copy.legal.cookieBannerReject.length > 0, true);
      assert.equal(copy.legal.cookiePreferences.length > 0, true);
    }
    assert.match(en.legal.privacyThirdParty1, /receives no personal data/);
    assert.match(pt.legal.privacyThirdParty1, /não recebe dados pessoais/);
    assert.match(es.legal.privacyThirdParty1, /no recibe datos personales/);
    assert.match(fr.legal.privacyThirdParty1, /aucune donnée personnelle/);
    assert.match(de.legal.privacyThirdParty1, /keine personenbezogenen Daten/);

    assert.equal(
      `${pt.auth.termsConsentBefore}${pt.auth.termsConsentTerms}${pt.auth.termsConsentMiddle}${pt.auth.termsConsentPrivacy}${pt.auth.termsConsentAfter}`,
      "Li e aceito os Termos e a Política de Privacidade"
    );

    const termsPage = readFileSync(new URL("../app/terms/page.tsx", import.meta.url), "utf8");
    const privacyPage = readFileSync(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");
    assert.match(termsPage, /legal\.updatedDate/);
    assert.match(termsPage, /legal\.termsBusinessOnly/);
    assert.match(privacyPage, /legal\.updatedDate/);
    assert.match(privacyPage, /<strong>Perplexity<\/strong>/);
    assert.match(privacyPage, /<strong>Vercel<\/strong>/);
    assert.match(privacyPage, /<strong>Railway<\/strong>/);
    assert.match(privacyPage, /<strong>Cloudflare<\/strong>/);
    assert.equal(termsPage.includes("February 2026"), false);
    assert.equal(privacyPage.includes("February 2026"), false);
    assert.equal(termsPage.includes("NIF"), false);
    assert.equal(privacyPage.includes("NIF"), false);
  });
});
