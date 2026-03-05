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

      // 从左边缘向右滑：标准边缘返回手势
      if (dx > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (touchStart.current.x < 60) {
          navigate(-1);
        }
      }

      // 左滑返回：手指向左滑动触发返回（详情页等）
      if (dx < -100 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        navigate(-1);
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
