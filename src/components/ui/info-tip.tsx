"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

interface Props {
  content: string;
}

export function InfoTip({ content }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          tipRef.current && !tipRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open, close]);

  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const tipW = 224;
    let x = rect.left + rect.width / 2 - tipW / 2;
    if (x < 8) x = 8;
    if (x + tipW > window.innerWidth - 8) x = window.innerWidth - 8 - tipW;
    setPos({ x, y: rect.top + window.scrollY });
  }, [open]);

  return (
    <span
      ref={ref}
      className="inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      aria-describedby={open ? "info-tip-popup" : undefined}
    >
      <HelpCircle className="h-3 w-3 cursor-help text-muted-foreground hover:text-foreground transition-colors" aria-hidden="true" />
      {open && createPortal(
        <div
          ref={tipRef}
          id="info-tip-popup"
          role="tooltip"
          className="fixed z-[9999] w-56 rounded-lg border border-border bg-card px-3 py-2.5 text-[11px] leading-relaxed text-foreground shadow-xl"
          style={{ left: pos.x, top: pos.y, transform: "translateY(calc(-100% - 8px))" }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {content}
        </div>,
        document.body,
      )}
    </span>
  );
}
