"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring } from "framer-motion";

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const cursorX = useSpring(-100, { stiffness: 600, damping: 35 });
  const cursorY = useSpring(-100, { stiffness: 600, damping: 35 });

  const trailingX = useSpring(-100, { stiffness: 220, damping: 24 });
  const trailingY = useSpring(-100, { stiffness: 220, damping: 24 });

  useEffect(() => {
    // Check if touch device or prefers reduced motion
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (hasTouch || prefersReducedMotion) {
      setIsTouchDevice(true);
      return;
    }

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      trailingX.set(e.clientX);
      trailingY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = Boolean(
          target.closest("a, button, input, textarea, [role='button'], .clickable")
        );
        setIsPointer(isInteractive);
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", moveCursor);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [cursorX, cursorY, trailingX, trailingY, isVisible]);

  if (isTouchDevice || !isVisible) return null;

  return (
    <>
      {/* Central pinpoint */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-50 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF5A36] mix-blend-difference"
        style={{
          x: cursorX,
          y: cursorY,
        }}
      />
      {/* Trailing accent ring */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-50 rounded-full border border-[#FF5A36]/60 -translate-x-1/2 -translate-y-1/2 transition-[width,height,background-color] duration-150"
        style={{
          x: trailingX,
          y: trailingY,
          width: isPointer ? 44 : 26,
          height: isPointer ? 44 : 26,
          backgroundColor: isPointer ? "rgba(255, 90, 54, 0.12)" : "transparent",
        }}
      />
    </>
  );
}
