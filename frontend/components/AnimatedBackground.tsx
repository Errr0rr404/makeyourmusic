'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Wave {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  speed: number;
}

interface ShapeConfig {
  size: number;
  colorIndex: number;
  initialX: number;
  initialY: number;
  targetX1: number;
  targetY1: number;
  targetX2: number;
  targetY2: number;
  animDuration: number;
  animDelay: number;
  isCircle: boolean;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [mounted, setMounted] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const wavesRef = useRef<Wave[]>([]);
  const shapesConfigRef = useRef<ShapeConfig[]>([]);

  useEffect(() => {
    setMounted(true);
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    // Pre-calculate shape configurations to avoid hydration issues
    if (shapesConfigRef.current.length === 0) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      shapesConfigRef.current = Array.from({ length: 8 }, (_, i): ShapeConfig => ({
        size: 60 + Math.random() * 40,
        colorIndex: i % 3,
        initialX: Math.random() * width,
        initialY: Math.random() * height,
        targetX1: Math.random() * width,
        targetY1: Math.random() * height,
        targetX2: Math.random() * width,
        targetY2: Math.random() * height,
        animDuration: 20 + Math.random() * 15,
        animDelay: Math.random() * 5,
        isCircle: i % 2 === 0,
      }));
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Initialize particles
    const particles: Particle[] = [];
    const particleCount = 80;
    const colors = [
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(34, 211, 238, 0.8)',  // Cyan
      'rgba(139, 92, 246, 0.8)',  // Purple
      'rgba(236, 72, 153, 0.8)',  // Pink
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 200,
      });
    }

    particlesRef.current = particles;

    // Initialize waves
    const waves: Wave[] = [];
    for (let i = 0; i < 3; i++) {
      waves.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 0,
        opacity: 0.3,
        speed: 0.5 + Math.random() * 0.5,
      });
    }
    wavesRef.current = waves;

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      // Update and draw waves
      wavesRef.current.forEach((wave) => {
        wave.radius += wave.speed;
        wave.opacity -= 0.002;
        
        if (wave.radius > Math.max(canvas.width, canvas.height) * 0.8 || wave.opacity <= 0) {
          wave.x = Math.random() * canvas.width;
          wave.y = Math.random() * canvas.height;
          wave.radius = 0;
          wave.opacity = 0.3;
        }

        // Draw wave
        const gradient = ctx.createRadialGradient(wave.x, wave.y, 0, wave.x, wave.y, wave.radius);
        gradient.addColorStop(0, `rgba(59, 130, 246, ${wave.opacity * 0.2})`);
        gradient.addColorStop(0.5, `rgba(34, 211, 238, ${wave.opacity * 0.1})`);
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update particles
      const mouse = mouseRef.current;
      particlesRef.current.forEach((particle) => {
        // Mouse interaction
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 200;

        if (distance < maxDistance) {
          const force = (maxDistance - distance) / maxDistance;
          particle.vx += (dx / distance) * force * 0.02;
          particle.vy += (dy / distance) * force * 0.02;
        }

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Boundary bounce
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -0.8;
          particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -0.8;
          particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        }

        // Friction
        particle.vx *= 0.98;
        particle.vy *= 0.98;

        // Update life
        particle.life += 0.5;
        if (particle.life > particle.maxLife) {
          particle.life = 0;
        }
      });

      // Draw connections between nearby particles
      particlesRef.current.forEach((particle, i) => {
        particlesRef.current.slice(i + 1).forEach((otherParticle) => {
          const dx = otherParticle.x - particle.x;
          const dy = otherParticle.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 120;

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.3;
            const gradient = ctx.createLinearGradient(
              particle.x,
              particle.y,
              otherParticle.x,
              otherParticle.y
            );
            
            // Create flowing gradient based on particle colors
            gradient.addColorStop(0, particle.color.replace('0.8', opacity.toString()));
            gradient.addColorStop(1, otherParticle.color.replace('0.8', opacity.toString()));
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      // Draw particles with glow
      particlesRef.current.forEach((particle) => {
        const pulse = Math.sin(particle.life * 0.1) * 0.3 + 0.7;
        
        // Outer glow
        const glowGradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 4
        );
        glowGradient.addColorStop(0, particle.color.replace('0.8', (pulse * 0.6).toString()));
        glowGradient.addColorStop(1, particle.color.replace('0.8', '0'));
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core particle
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(particle.x - particle.size * 0.3, particle.y - particle.size * 0.3, particle.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, mounted]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'transparent' }}
      />
      
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 left-0 w-full h-full opacity-30"
          style={{
            background: 'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.2) 0%, transparent 50%)',
          }}
          animate={{
            background: [
              'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.2) 0%, transparent 50%)',
              'radial-gradient(circle at 30% 40%, rgba(139, 92, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 60% 40%, rgba(236, 72, 153, 0.2) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.2) 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Large floating orbs */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 150, 0],
            y: [0, 100, 0],
            scale: [1, 1.4, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -120, 0],
            y: [0, -100, 0],
            scale: [1, 1.5, 1],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-[500px] h-[500px] bg-gradient-to-br from-cyan-500/15 to-blue-500/15 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -80, 0],
            scale: [1, 1.3, 1],
            rotate: [0, -180, -360],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Geometric shapes floating */}
      {mounted && shapesConfigRef.current.length > 0 && (
        <div className="absolute inset-0">
          {shapesConfigRef.current.map((config, i) => {
            const colorOptions = ['rgba(59, 130, 246, 0.1)', 'rgba(34, 211, 238, 0.1)', 'rgba(139, 92, 246, 0.1)'] as const;
            const borderColors = ['rgba(59, 130, 246, 0.3)', 'rgba(34, 211, 238, 0.3)', 'rgba(139, 92, 246, 0.3)'] as const;
            
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  width: config.size,
                  height: config.size,
                  background: `linear-gradient(135deg, ${colorOptions[config.colorIndex]}, transparent)`,
                  borderRadius: config.isCircle ? '50%' : '20%',
                  border: `1px solid ${borderColors[config.colorIndex]}`,
                  backdropFilter: 'blur(10px)',
                }}
                initial={{
                  x: config.initialX,
                  y: config.initialY,
                  rotate: 0,
                  scale: 0.8,
                }}
                animate={{
                  x: [
                    config.initialX,
                    config.targetX1,
                    config.targetX2,
                  ],
                  y: [
                    config.initialY,
                    config.targetY1,
                    config.targetY2,
                  ],
                  rotate: [0, 180, 360],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: config.animDuration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: config.animDelay,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
