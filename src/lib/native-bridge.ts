/**
 * Native Android APK Bridge + Web Wake Lock & Haptics helper.
 * Works both inside our offline Android APK (via window.AndroidBridge)
 * and in mobile/tablet web browsers.
 */

export interface AndroidNativeBridge {
  vibrate?: (durationMs: number) => void;
  vibratePattern?: (patternCsv: string) => void;
  keepScreenOn?: (enabled: boolean) => void;
  enterImmersiveFullscreen?: () => void;
  getAppVersion?: () => string;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidNativeBridge;
    __MONOPOLY_CITY_APK__?: boolean;
  }
}

export const APK_DOWNLOAD_PATH = "/monopoly-city-trading-desk.apk?v=1.1.0";
export const APK_FILENAME = "Monopoly-City-Trading-Desk-v1.1.apk";

/**
 * Returns true when running inside the installed Android APK wrapper.
 */
export function isRunningInAndroidApk(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__MONOPOLY_CITY_APK__ || window.AndroidBridge) return true;
  const ua = window.navigator?.userAgent ?? "";
  return ua.includes("MonopolyCityAPK") || window.location.search.includes("apk=1");
}

/**
 * Triggers tactile haptic vibration on Android APK or supporting mobile browsers.
 */
export function triggerHaptic(pattern: number | number[]): void {
  if (typeof window === "undefined") return;
  try {
    if (window.AndroidBridge) {
      if (typeof pattern === "number") {
        window.AndroidBridge.vibrate?.(pattern);
        return;
      } else if (Array.isArray(pattern) && window.AndroidBridge.vibratePattern) {
        window.AndroidBridge.vibratePattern(pattern.join(","));
        return;
      } else if (Array.isArray(pattern) && pattern.length > 0) {
        window.AndroidBridge.vibrate?.(pattern[0]!);
        return;
      }
    }
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore on unsupported devices
  }
}

let wakeLockSentinel: WakeLockSentinel | null = null;

/**
 * Requests a screen wake lock so the tablet/phone never dims or locks
 * during turns or the 50-second secret auction timer.
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    window.AndroidBridge?.keepScreenOn?.(true);
    window.AndroidBridge?.enterImmersiveFullscreen?.();
  } catch {
    // Ignore bridge errors
  }

  try {
    if ("wakeLock" in navigator && navigator.wakeLock) {
      if (wakeLockSentinel && !wakeLockSentinel.released) {
        return true;
      }
      wakeLockSentinel = await navigator.wakeLock.request("screen");
      return true;
    }
  } catch {
    // Browser may require user gesture first; will retry on pointerdown
  }
  return isRunningInAndroidApk();
}

/**
 * Sets up automatic wake-lock re-acquisition on visibilitychange and user interaction.
 */
export function initNativeEnhancements(): () => void {
  if (typeof window === "undefined") return () => {};

  void requestScreenWakeLock();

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void requestScreenWakeLock();
    }
  };

  const onFirstInteraction = () => {
    void requestScreenWakeLock();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pointerdown", onFirstInteraction, { passive: true });

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pointerdown", onFirstInteraction);
  };
}

