"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { URL_FLASH_MESSAGES, appToast, humanizeError } from "@/lib/toast";

const FLASH_KEYS = ["error", "success", "warning", "info", "message"] as const;

function UrlFlashToastsInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    const present = FLASH_KEYS.map((key) => {
      const value = searchParams.get(key);
      return value ? `${key}=${value}` : null;
    }).filter(Boolean);
    if (present.length === 0) {
      handledKey.current = null;
      return;
    }

    const fingerprint = `${pathname}?${present.join("&")}`;
    if (handledKey.current === fingerprint) return;
    handledKey.current = fingerprint;

    for (const key of FLASH_KEYS) {
      const value = searchParams.get(key);
      if (!value) continue;

      const mapped = URL_FLASH_MESSAGES[value];
      if (mapped) {
        appToast[mapped.type]({
          title: mapped.title,
          description: mapped.description,
          id: `url:${key}:${value}`,
        });
        continue;
      }

      if (key === "success" || key === "message") {
        appToast.success({
          title: decodeURIComponent(value),
          id: `url:${key}:${value}`,
        });
        continue;
      }

      if (key === "warning") {
        appToast.warning({
          title: humanizeError(decodeURIComponent(value)),
          id: `url:${key}:${value}`,
        });
        continue;
      }

      if (key === "info") {
        appToast.info({
          title: decodeURIComponent(value),
          id: `url:${key}:${value}`,
        });
        continue;
      }

      appToast.error({
        title: humanizeError(decodeURIComponent(value)),
        id: `url:error:${value}`,
      });
    }

    const next = new URLSearchParams(searchParams.toString());
    for (const key of FLASH_KEYS) next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}

/** Consumes one-shot feedback query params, toasts once, then strips them. */
export function UrlFlashToasts() {
  return (
    <Suspense fallback={null}>
      <UrlFlashToastsInner />
    </Suspense>
  );
}
