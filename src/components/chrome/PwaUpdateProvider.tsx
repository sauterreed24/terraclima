import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  markServiceWorkerUpdateAccepted,
  registerServiceWorker,
  type PwaController,
} from "../../lib/pwa";
import { PwaUpdateBanner } from "./PwaUpdateBanner";

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const [pendingRegistration, setPendingRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const controllerRef = useRef<PwaController | null>(null);

  useEffect(() => {
    controllerRef.current = registerServiceWorker({
      onUpdateAvailable: registration => setPendingRegistration(registration),
    });
  }, []);

  const dismiss = useCallback(() => setPendingRegistration(null), []);

  const refresh = useCallback(() => {
    if (!pendingRegistration) return;
    markServiceWorkerUpdateAccepted();
    if (pendingRegistration.waiting) {
      controllerRef.current?.activateUpdate(pendingRegistration);
    } else {
      window.location.reload();
    }
    setPendingRegistration(null);
  }, [pendingRegistration]);

  return (
    <>
      {children}
      {pendingRegistration ? (
        <PwaUpdateBanner onRefresh={refresh} onDismiss={dismiss} />
      ) : null}
    </>
  );
}
