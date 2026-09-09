"use client";

import { useEffect, useRef } from "react";

import { appToast } from "@/lib/toast";

/**
 * Turns form action state into toasts. Renders nothing — field errors stay on inputs.
 * Dedupes identical consecutive payloads from React Strict Mode / rerenders.
 */
export function FormMessage({
  error,
  success,
  warning,
  info,
}: {
  error?: string;
  success?: string;
  warning?: string;
  info?: string;
}) {
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const key = error
      ? `error:${error}`
      : success
        ? `success:${success}`
        : warning
          ? `warning:${warning}`
          : info
            ? `info:${info}`
            : null;

    if (!key) {
      lastKey.current = null;
      return;
    }
    if (lastKey.current === key) return;
    lastKey.current = key;

    if (error) {
      appToast.error({ title: error, id: key });
      return;
    }
    if (success) {
      appToast.success({ title: success, id: key });
      return;
    }
    if (warning) {
      appToast.warning({ title: warning, id: key });
      return;
    }
    if (info) {
      appToast.info({ title: info, id: key });
    }
  }, [error, success, warning, info]);

  return null;
}
