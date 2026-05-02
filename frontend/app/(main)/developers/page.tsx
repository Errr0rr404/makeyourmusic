import type { Metadata } from 'next';
import Link from 'next/link';
import { Code, ShoppingBag, Key } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Developers · MakeYourMusic',
  description: 'Build on MakeYourMusic — register OAuth apps, browse the integrations marketplace, manage API keys.',
};

export default function DevelopersHome() {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Code className="w-5 h-5 text-purple-300" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Developers</span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Build on MakeYourMusic</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        Plug AI music generation into your own app. Use a personal API key for server-side scripts,
        or register an OAuth app to act on behalf of MakeYourMusic users.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/developers/apps"
          className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 hover:border-purple-400/40 transition-colors"
        >
          <ShoppingBag className="w-5 h-5 text-purple-300 mb-2" />
          <h2 className="text-sm font-semibold text-white mb-1">Integrations marketplace</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Browse approved apps that connect to your MakeYourMusic account.
          </p>
        </Link>
        <Link
          href="/developers/apps?mine=1"
          className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 hover:border-purple-400/40 transition-colors"
        >
          <Code className="w-5 h-5 text-purple-300 mb-2" />
          <h2 className="text-sm font-semibold text-white mb-1">Your OAuth apps</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Register and manage apps that authorize end-users via OAuth 2.0 + PKCE.
          </p>
        </Link>
        <Link
          href="/settings/api-keys"
          className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 hover:border-purple-400/40 transition-colors sm:col-span-2"
        >
          <Key className="w-5 h-5 text-purple-300 mb-2" />
          <h2 className="text-sm font-semibold text-white mb-1">Personal API keys</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            For server-side scripts and your own backend integrations.
          </p>
        </Link>
      </div>
    </div>
  );
}
