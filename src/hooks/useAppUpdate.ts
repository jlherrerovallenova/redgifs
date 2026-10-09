import { useState, useEffect, useCallback, useRef } from 'react';

// Declared via Vite define in vite.config.ts
declare const __APP_BUILD_TIME__: string;

const CURRENT_BUILD_TIME = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : new Date().toISOString();

export interface UpdateInfo {
  version: string;
  buildTime: string;
  timestamp: number;
}

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [latestVersionInfo, setLatestVersionInfo] = useState<UpdateInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // 1. Verificación directa contra /version.json
  const checkVersionJson = useCallback(async (manual = false): Promise<boolean> => {
    try {
      if (manual) setIsChecking(true);
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) return false;
      const data: UpdateInfo = await res.json();

      if (data && data.buildTime && data.buildTime !== CURRENT_BUILD_TIME) {
        setLatestVersionInfo(data);
        setUpdateAvailable(true);
        setIsDismissed(false);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      if (manual) setIsChecking(false);
    }
  }, []);

  // 2. Integración con Service Worker Lifecycle
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      // Si el navegador no soporta SW, hacer solo polling de version.json
      checkVersionJson();
      const interval = setInterval(() => checkVersionJson(), 3 * 60 * 1000);
      return () => clearInterval(interval);
    }

    // Escuchar cambios de controlador para recargar cuando el nuevo SW tome el mando
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      registrationRef.current = reg;

      // Si ya hay un worker esperando
      if (reg.waiting) {
        waitingWorkerRef.current = reg.waiting;
        setUpdateAvailable(true);
      }

      // Si se encuentra una actualización en curso
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorkerRef.current = newWorker;
            setUpdateAvailable(true);
            setIsDismissed(false);
          }
        });
      });
    });

    // Verificación inicial de version.json
    checkVersionJson();

    // Verificación periódica cada 3 minutos
    const intervalId = window.setInterval(() => {
      if (registrationRef.current) {
        registrationRef.current.update().catch(() => {});
      }
      checkVersionJson();
    }, 3 * 60 * 1000);

    // Verificación cuando la pestaña vuelve a ser visible (e.g. desbloquear iPad)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (registrationRef.current) {
          registrationRef.current.update().catch(() => {});
        }
        checkVersionJson();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersionJson]);

  // 3. Aplicar actualización y recargar inmediatamente
  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);

    try {
      // Forzar activación del service worker si existe
      if (waitingWorkerRef.current) {
        waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
      }

      // Limpiar caches del navegador para asegurar que no queden scripts obsoletos
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Pequeño delay visual para que el usuario perciba la acción
      setTimeout(() => {
        // Recargar forzando bypass de cache
        window.location.reload();
      }, 350);
    } catch {
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
  }, []);

  return {
    updateAvailable: updateAvailable && !isDismissed,
    latestVersionInfo,
    isUpdating,
    isChecking,
    applyUpdate,
    dismissUpdate,
    checkForUpdateManual: checkVersionJson
  };
}
