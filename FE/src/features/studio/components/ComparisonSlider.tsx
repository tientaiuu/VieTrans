import React, { useState, useRef } from 'react';

interface ComparisonSliderProps {
  original: string;
  translated: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ original, translated }) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offset = ((x - rect.left) / rect.width) * 100;
    
    setPosition(Math.min(Math.max(offset, 0), 100));
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden border border-[var(--ln)] rounded-xl h-full bg-[var(--bg)]">
      <div 
        className="res-compare flex-1 w-full h-full relative overflow-hidden select-none" 
        ref={containerRef}
        onMouseMove={handleMove}
        onTouchMove={handleMove}
      >
        {/* Background (Translated) */}
        <div className="rci">
          <img src={translated} alt="Translated" />
        </div>

        {/* Foreground (Original) with Clip Path */}
        <div 
          className="rci rca" 
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img src={original} alt="Original" />
        </div>

        {/* Handle */}
        <div className="rch" style={{ left: `${position}%` }}>
          <div className="rch-k">⇄</div>
        </div>

        {/* Labels */}
        <div className="rclbl">
          <span className="rcb or">Original</span>
          <span className="rcb tr">Translated</span>
        </div>
      </div>
    </div>
  );
};
