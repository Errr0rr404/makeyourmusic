import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface SplashLoaderProps {
    logo: string;
    appName: string;
    onComplete: () => void;
    color?: string;
}

const STATUS_MESSAGES = [
    "Calibrating Neural Pathways...",
    "Synchronizing Database Nodes...",
    "Optimizing UX Architecture...",
    "Establishing Secure Connection...",
    "Finalizing Interface Elements..."
];

export const SplashLoader: React.FC<SplashLoaderProps> = ({ logo, appName, onComplete, color = '#3b82f6' }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("Initializing Core Systems...");
    const completionTimeoutRef = useRef<number | null>(null);
    // Track whether we already kicked off completion. React strict mode runs
    // effects + their cleanups twice in dev, so without this guard the
    // 800ms-delayed `onComplete` could fire twice.
    const completedRef = useRef(false);

    useEffect(() => {
        completedRef.current = false;
        const timer = setInterval(() => {
            // Pure incrementer — no side-effects from inside a setState updater
            // (strict mode runs updaters twice, which used to schedule
            // duplicate timers and re-set status from the wrong branch).
            setProgress((prev) => (prev >= 100 ? 100 : prev + 1.5));
        }, 30);
        return () => {
            clearInterval(timer);
            if (completionTimeoutRef.current) {
                window.clearTimeout(completionTimeoutRef.current);
                completionTimeoutRef.current = null;
            }
        };
    }, []);

    // Drive status messages off `progress` state instead of inside the
    // updater function. Same effect; no double-fire.
    useEffect(() => {
        const messageIndex = Math.floor((progress / 100) * STATUS_MESSAGES.length);
        const next = STATUS_MESSAGES[Math.min(messageIndex, STATUS_MESSAGES.length - 1)];
        if (next) setStatus(next);
        if (progress >= 100 && !completedRef.current) {
            completedRef.current = true;
            completionTimeoutRef.current = window.setTimeout(onComplete, 800);
        }
    }, [progress, onComplete]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
            transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="fixed inset-0 z-[9999] bg-[#020205] flex flex-col items-center justify-center p-6 overflow-hidden"
        >
            {/* Background Texture & Grid */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ backgroundImage: `radial-gradient(${color}22 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
            <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none mix-blend-overlay" />

            {/* Ambient Glows */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${color}44 0%, transparent 70%)`
                }}
            />

            {/* Logo Container */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="relative mb-12"
            >
                <div className="absolute inset-0 blur-3xl opacity-30 animate-pulse" style={{ backgroundColor: color }}></div>
                <div className="relative z-10 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                    <img src={logo} alt={appName} className="w-24 h-24 lg:w-32 lg:h-32 object-contain" />
                </div>

                {/* Orbiting Ring */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-4 border border-white/5 rounded-full"
                />
            </motion.div>

            {/* App Name */}
            <div className="text-center mb-12 relative">
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="text-5xl lg:text-7xl font-black font-display tracking-tighter"
                >
                    {appName.split(' ').map((word, i) => (
                        <span key={i} className={i === 0 ? "text-white" : "ml-3"} style={i !== 0 ? { color } : {}}>
                            {word}
                        </span>
                    ))}
                </motion.h1>
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '100%', opacity: 1 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mt-4"
                />
            </div>

            {/* Progress Area */}
            <div className="w-72 space-y-4">
                <div className="flex justify-between items-end px-1">
                    <motion.p
                        key={status}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40"
                    >
                        {status}
                    </motion.p>
                    <span className="text-[10px] font-mono font-bold text-white/60">{Math.round(progress)}%</span>
                </div>

                <div className="h-1 bg-white/5 rounded-full overflow-hidden relative">
                    <motion.div
                        className="h-full relative z-10"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                        style={{ backgroundColor: color }}
                    >
                        <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/40" />
                    </motion.div>
                </div>
            </div>

            {/* Footer Brand */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-12 flex items-center gap-3"
            >
                <div className="w-8 h-[1px] bg-white/10" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10">Antigravity OS</span>
                <div className="w-8 h-[1px] bg-white/10" />
            </motion.div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse-opacity {
                    0%, 100% { opacity: 0.1; }
                    50% { opacity: 0.3; }
                }
                .bg-noise {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                }
            `}} />
        </motion.div>
    );
};
