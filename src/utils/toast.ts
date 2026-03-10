import { useCallback, useEffect, useRef } from "react";

type ToastTone = "success" | "error";

export function useBottomToast() {
  const toastRef = useRef<{ el: HTMLDivElement | null; timer: ReturnType<typeof setTimeout> | null }>({
    el: null,
    timer: null,
  });

  const dismissToast = useCallback(() => {
    if (toastRef.current.timer) {
      clearTimeout(toastRef.current.timer);
    }
    if (toastRef.current.el && document.body.contains(toastRef.current.el)) {
      document.body.removeChild(toastRef.current.el);
    }
    toastRef.current.el = null;
    toastRef.current.timer = null;
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      dismissToast();

      const toastEl = document.createElement("div");
      toastEl.textContent = message;
      Object.assign(toastEl.style, {
        position: "fixed",
        bottom: "96px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(15,23,42,0.88)",
        color: "#f8fafc",
        padding: "10px 18px",
        borderRadius: "24px",
        fontSize: "14px",
        zIndex: "9999",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        maxWidth: "90vw",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxShadow: "0 10px 30px rgba(15,23,42,0.18)",
        border: tone === "error" ? "1px solid rgba(248,113,113,0.28)" : "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
      });
      document.body.appendChild(toastEl);

      toastRef.current.el = toastEl;
      toastRef.current.timer = setTimeout(() => {
        if (toastEl && document.body.contains(toastEl)) {
          document.body.removeChild(toastEl);
        }
        toastRef.current.el = null;
        toastRef.current.timer = null;
      }, 2200);
    },
    [dismissToast],
  );

  useEffect(() => dismissToast, [dismissToast]);

  return { showToast, dismissToast };
}
