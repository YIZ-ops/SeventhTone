import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export function useSwipeBack() {
  const navigate = useNavigate();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };

      const dx = touchEnd.x - touchStart.current.x;
      const dy = touchEnd.y - touchStart.current.y;

      // Swipe right (from left to right) to go back - Standard iOS/Android gesture
      if (dx > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        // Trigger if starting from the left edge (first 60px)
        if (touchStart.current.x < 60) {
          navigate(-1);
        }
      }

      // If the user literally meant "swipe finger to the left" (左滑)
      // Some users might use this terminology for "going back" in specific apps
      if (dx < -100 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        // navigate(-1); // Uncomment if "swipe left" is truly desired for back
      }

      touchStart.current = null;
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate]);
}
