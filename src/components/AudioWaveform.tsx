import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  color: string;
}

export function AudioWaveform({ isRecording, color }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    let phase = 0;

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (isRecording) {
        // Draw multiple overlapping sine waves to simulate voice activity
        phase += 0.15;
        
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;

        const numWaves = 3;
        for (let j = 0; j < numWaves; j++) {
          ctx.beginPath();
          // Decrease amplitude and increase frequency for layered waves
          const amplitude = (h / 2.5) * (1 - j / numWaves) * (0.4 + Math.random() * 0.2);
          const frequency = 0.02 + j * 0.01;

          for (let x = 0; x < w; x++) {
            const y = h / 2 + Math.sin(x * frequency + phase + j) * amplitude;
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.globalAlpha = 1.0 - j / numWaves;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      } else {
        // Draw a calm flat line with minor noise when idle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
