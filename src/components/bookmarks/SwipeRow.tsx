import React, { useRef, useState, type TouchEvent } from "react";
import { Trash2 } from "lucide-react";

export default function SwipeRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHRef = useRef<boolean | null>(null);
  const baseOffsetRef = useRef(0);
  const REVEAL = 76;
  const TRIGGER = 36;

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHRef.current = null;
    baseOffsetRef.current = offset;
    setAnimating(false);
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;
    if (isHRef.current === null) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      isHRef.current = Math.abs(dx) >= Math.abs(dy);
    }
    if (!isHRef.current) return;

    e.stopPropagation();
    (e.nativeEvent as globalThis.TouchEvent).stopImmediatePropagation?.();
    setOffset(Math.min(0, Math.max(-REVEAL, baseOffsetRef.current + dx)));
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (isHRef.current === true) {
      e.stopPropagation();
      (e.nativeEvent as globalThis.TouchEvent).stopImmediatePropagation?.();
    }
    isHRef.current = null;
    setAnimating(true);
    const snap = offset < -TRIGGER ? -REVEAL : 0;
    setOffset(snap);
    baseOffsetRef.current = snap;
  };

  const close = () => {
    setAnimating(true);
    setOffset(0);
    baseOffsetRef.current = 0;
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-600"
      onClick={() => {
        if (offset < 0) close();
      }}
    >
      <div className="absolute inset-y-0 right-0 w-[76px] bg-red-400 flex flex-col items-center justify-center gap-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex flex-col items-center gap-0.5 text-white w-full h-full justify-center"
        >
          <Trash2 size={18} />
        </button>
      </div>
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: animating ? "transform 0.18s ease" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
