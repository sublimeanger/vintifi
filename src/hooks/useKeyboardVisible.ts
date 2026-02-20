import { useState, useEffect } from "react";

/**
 * Detects whether the mobile virtual keyboard is visible.
 * Uses the Visual Viewport API (supported in all modern browsers).
 * Returns true when the viewport shrinks significantly (keyboard opening).
 */
export function useKeyboardVisible(): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const threshold = 0.75;

    const handleResize = () => {
      const ratio = vv.height / window.innerHeight;
      setIsVisible(ratio < threshold);
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return isVisible;
}
