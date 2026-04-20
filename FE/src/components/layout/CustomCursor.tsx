import React, { useEffect, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sourceRef.current) {
        sourceRef.current.style.left = `${e.clientX}px`;
        sourceRef.current.style.top = `${e.clientY}px`;
      }
      
      // Target lags behind slightly
      setTimeout(() => {
        if (targetRef.current) {
          targetRef.current.style.left = `${e.clientX}px`;
          targetRef.current.style.top = `${e.clientY}px`;
        }
      }, 50);

      // Hover detection
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button, a, .uz-hl, .logo-wrap');
      
      if (isInteractive) {
        document.body.classList.add('hov');
      } else {
        document.body.classList.remove('hov');
      }

      // Contrast/Invert detection (for blue backgrounds)
      const isOverBlue = target.closest('.btn-primary, .nr-btn, .proc-btn, .numbers, .cta-band, .sb-badge, .lw-vie');
      if (isOverBlue) {
        document.body.classList.add('inv');
      } else {
        document.body.classList.remove('inv');
      }
    };

    const handleMouseDown = () => document.body.classList.add('clk');
    const handleMouseUp = () => document.body.classList.remove('clk');

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      <div id="cs" ref={sourceRef} />
      <div id="ct" ref={targetRef} />
    </>
  );
};
