"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  shouldLoadMetaPixel,
} from "@/lib/cookie-consent";

const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "2376866906420943";

/** Facebook Pixel — official snippet (loads after cookie banner accept). */
const FACEBOOK_PIXEL_SCRIPT = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`;

export function MetaPixel() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => {
      const allowed = shouldLoadMetaPixel();
      setEnabled(allowed);
      if (!allowed) {
        document.getElementById("facebook-pixel")?.remove();
        document
          .querySelectorAll('script[src*="connect.facebook.net"]')
          .forEach((node) => node.remove());
      }
    };
    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
    window.addEventListener("cookie-consent-granted", sync);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
      window.removeEventListener("cookie-consent-granted", sync);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script id="facebook-pixel" strategy="afterInteractive">
        {FACEBOOK_PIXEL_SCRIPT}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
