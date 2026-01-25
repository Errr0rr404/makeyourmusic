'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  baseSize: number;
  baseOpacity: number;
  pulseOffset: number;
  update: (time: number) => void;
  draw: () => void;
}

interface ParticleBackgroundProps {
  enabled?: boolean;
  density?: number; // Number of particles (default: 50)
  speed?: number; // Speed multiplier (default: 1)
  color?: string; // Particle color in HSL format (e.g., "221 83% 53%")
  type?: 'dots' | 'stars' | 'lines'; // Particle type (default: 'dots')
  className?: string;
}

export default function ParticleBackground({
  enabled = true,
  density = 40,
  speed = 0.6,
  color = '221 83% 70%',
  type = 'dots',
  className = '',
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!enabled || !canvasRef.current) {
      // Clear particles if disabled
      particlesRef.current = [];
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Extract HSL values for glow effect
    const parseHSL = (hslString: string) => {
      const match = hslString.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
      if (match && match[1] && match[2] && match[3]) {
        return {
          h: parseFloat(match[1]),
          s: parseFloat(match[2]),
          l: parseFloat(match[3]),
        };
      }
      return { h: 221, s: 83, l: 70 };
    };
    const hsl = parseHSL(color);

    // Particle class - must be defined before any functions that use it
    class ParticleImpl implements Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      baseSize: number;
      baseOpacity: number;
      pulseOffset: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.pulseOffset = Math.random() * Math.PI * 2;
        
        // Elegant, slow movement
        const baseSpeed = 0.3 * speed;
        this.vx = (Math.random() - 0.5) * baseSpeed;
        this.vy = (Math.random() - 0.5) * baseSpeed;
        
        if (type === 'stars') {
          this.baseSize = Math.random() * 1.5 + 0.8;
          this.baseOpacity = Math.random() * 0.15 + 0.1;
        } else if (type === 'lines') {
          this.baseSize = 1;
          this.baseOpacity = Math.random() * 0.2 + 0.15;
        } else {
          // dots - smaller, more subtle
          this.baseSize = Math.random() * 1.2 + 0.6;
          this.baseOpacity = Math.random() * 0.2 + 0.15;
        }
        
        this.size = this.baseSize;
        this.opacity = this.baseOpacity;
      }

      update(time: number) {
        this.x += this.vx;
        this.y += this.vy;

        // Gentle pulsing effect
        const pulse = Math.sin(time * 0.001 + this.pulseOffset) * 0.15 + 1;
        this.size = this.baseSize * pulse;
        this.opacity = this.baseOpacity * (0.8 + pulse * 0.2);

        // Wrap around edges
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      draw() {
        if (!ctx) return;
        
        ctx.save();
        
        if (type === 'stars') {
          // Elegant glowing stars
          const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * 2
          );
          gradient.addColorStop(0, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${this.opacity})`);
          gradient.addColorStop(0.5, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${this.opacity * 0.3})`);
          gradient.addColorStop(1, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Star core
          ctx.globalAlpha = this.opacity * 1.2;
          ctx.fillStyle = `hsl(${hsl.h}, ${hsl.s}%, ${Math.min(hsl.l + 20, 100)}%)`;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === 'lines') {
          // Small dots for lines
          ctx.globalAlpha = this.opacity;
          ctx.fillStyle = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Elegant glowing dots
          const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * 2.5
          );
          gradient.addColorStop(0, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${this.opacity})`);
          gradient.addColorStop(0.4, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${this.opacity * 0.4})`);
          gradient.addColorStop(1, `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
      }
    }

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    // Initialize canvas and particles
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles only once
    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: density }, () => new ParticleImpl());
    }

    // Draw connections between nearby particles (for lines type)
    const drawConnections = () => {
      if (type !== 'lines') return;
      
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        if (!p1) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          if (!p2) continue;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 120) {
            ctx.save();
            const connectionOpacity = (1 - distance / 120) * 0.15;
            ctx.strokeStyle = `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${connectionOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    };

    // Animation loop
    const animate = (timestamp: number) => {
      timeRef.current = timestamp;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        particle.update(timestamp);
        particle.draw();
      });

      // Draw connections for lines type
      drawConnections();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      particlesRef.current = [];
    };
  }, [enabled, density, speed, color, type]);

  if (!enabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
