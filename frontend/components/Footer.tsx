'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function FooterContent() {
  return (
    <footer className="border-t bg-muted/50 mt-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Kairux
            </h3>
            <p className="text-sm text-muted-foreground mb-2">Business in Flow</p>
            <p className="text-xs text-muted-foreground">
              Where business connects and flows seamlessly
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About Kairux
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-primary transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Modules */}
          <div>
            <h4 className="font-semibold mb-3">ERP Modules</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Accounting & Finance</li>
              <li>CRM & Sales</li>
              <li>Human Resources</li>
              <li>Inventory Management</li>
              <li>Project Management</li>
              <li>AI-Powered Analytics</li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Kairux. All rights reserved.</p>
            <p className="text-xs">Modern AI-Powered Cloud ERP System</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
