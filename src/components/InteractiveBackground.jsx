/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState, useRef } from 'react';

export default function InteractiveBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = () => {
      if (mediaQuery.matches) {
        window.removeEventListener('mousemove', handleMouseMove);
      } else {
        window.addEventListener('mousemove', handleMouseMove);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    let rafId;

    // Throttled mouse move handler using requestAnimationFrame for performance
    const handleMouseMove = (e) => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        if (containerRef.current) {
          // Update CSS custom properties for the cursor light effect
          containerRef.current.style.setProperty('--mouse-x', `${e.clientX}px`);
          containerRef.current.style.setProperty('--mouse-y', `${e.clientY}px`);
        }
      });
    };

    if (!mediaQuery.matches) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Cleanup function to remove listeners
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('mousemove', handleMouseMove);
      if(rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div className="interactive-background" ref={containerRef} aria-hidden="true">
      <div className="interactive-cursor"></div>
      <div className="interactive-blob interactive-blob-1"></div>
      <div className="interactive-blob interactive-blob-2"></div>
      <div className="interactive-blob interactive-blob-3"></div>
    </div>
  );
}