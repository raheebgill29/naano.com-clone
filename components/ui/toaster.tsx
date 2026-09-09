"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Single app-wide toast host. Mount once from the root layout.
 * Distinct from the in-app notification bell (database-backed).
 */
export function AppToaster() {
  return (
    <SonnerToaster
      position="top-center"
      closeButton
      richColors={false}
      expand={false}
      visibleToasts={4}
      gap={10}
      offset={{
        top: "max(0.75rem, env(safe-area-inset-top))",
      }}
      mobileOffset={{
        top: "max(4.25rem, calc(env(safe-area-inset-top) + 3.5rem))",
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "naano-toast",
          title: "naano-toast__title",
          description: "naano-toast__description",
          actionButton: "naano-toast__action",
          cancelButton: "naano-toast__cancel",
          closeButton: "naano-toast__close",
          icon: "naano-toast__icon",
        },
      }}
    />
  );
}
