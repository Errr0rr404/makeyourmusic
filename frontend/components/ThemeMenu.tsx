'use client';

import { Disc3, Monitor, Moon, Palette, Radio, Sun } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export function ThemeMenu() {
  const { skin, palette, setSkin, setPalette } = useTheme();
  const [open, setOpen] = useState(false);

  const styles = [
    { id: 'modern' as const, label: 'Modern', desc: 'Electric · Studio', icon: Radio },
    { id: 'vintage' as const, label: 'Vintage', desc: 'Cassette · Hi-Fi', icon: Disc3 },
  ];
  const modes = [
    { id: 'dark' as const, label: 'Dark', icon: Moon },
    { id: 'light' as const, label: 'Light', icon: Sun },
    { id: 'system' as const, label: 'Auto', icon: Monitor },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Theme settings"
          className="inline-flex w-9 h-9 items-center justify-center rounded-full bg-[color:var(--bg-elev-2)] text-[color:var(--text-soft)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-elev-3)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
        >
          <Palette className="w-4 h-4" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 bg-[color:var(--bg-elev-1)] border-[color:var(--stroke)] text-[color:var(--text)] p-4 shadow-2xl shadow-black/40"
      >
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-mute)] mb-2">
              Style
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {styles.map((opt) => {
                const Icon = opt.icon;
                const active = skin === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSkin(opt.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border text-left transition-colors ${
                      active
                        ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]'
                        : 'bg-[color:var(--bg-elev-2)] border-[color:var(--stroke)] hover:bg-[color:var(--bg-elev-3)]'
                    }`}
                    aria-pressed={active}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        active ? 'text-[hsl(var(--accent))]' : 'text-[color:var(--text-mute)]'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[color:var(--text)] leading-tight">
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-[color:var(--text-mute)] leading-tight mt-0.5 truncate">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-mute)] mb-2">
              Mode
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {modes.map((opt) => {
                const Icon = opt.icon;
                const active = palette === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPalette(opt.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-md border transition-colors ${
                      active
                        ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))] text-[hsl(var(--accent))]'
                        : 'bg-[color:var(--bg-elev-2)] border-[color:var(--stroke)] text-[color:var(--text-mute)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-elev-3)]'
                    }`}
                    aria-pressed={active}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block text-center text-xs text-[color:var(--text-mute)] hover:text-[color:var(--text)] transition-colors pt-3 border-t border-[color:var(--stroke)] -mx-4 -mb-4 px-4 pb-3"
          >
            More appearance options →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
