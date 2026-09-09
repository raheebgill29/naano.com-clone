"use client";

import { useEffect, useRef } from "react";

import { appToast } from "@/lib/toast";

/** Fire a one-shot error toast when a server page surfaces a load failure. */
export function LoadErrorToast({
  message,
  id,
}: {
  message: string;
  id?: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !message) return;
    fired.current = true;
    appToast.error({
      title: "Could not load data",
      description: message,
      id: id ?? `load-error:${message}`,
    });
  }, [id, message]);

  return null;
}
