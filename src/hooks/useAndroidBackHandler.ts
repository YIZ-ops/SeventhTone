import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

export interface AndroidBackButtonEvent {
  canGoBack: boolean;
}

export function useAndroidBackHandler(handler: (event: AndroidBackButtonEvent) => void, enabled = true) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled || Capacitor.getPlatform() !== "android") return;

    let removeListener: (() => Promise<void>) | null = null;
    CapacitorApp.addListener("backButton", (event) => {
      handlerRef.current(event as AndroidBackButtonEvent);
    }).then((listener) => {
      removeListener = listener.remove;
    });

    return () => {
      removeListener?.();
    };
  }, [enabled]);
}
