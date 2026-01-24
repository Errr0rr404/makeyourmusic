'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import { Menu, X, User, Home, LayoutDashboard, Settings, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from './GlobalSearch';

export default function Navbar() {
  const { user, isAuthenticated, logout, fetchUser } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && !isAuthenticated) {
        fetchUser();
      }
    }
  }, [isAuthenticated, fetchUser]);
  
  const storeName = 'Kairux';

  return (
    <nav 
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md p-1"
              aria-label={`${storeName} home page`}
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center" aria-hidden="true">
                <Home className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {storeName}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">Business in Flow</span>
            </Link>
          </div>

          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-4">
              <NavLink href="/erp" icon={LayoutDashboard}>Dashboard</NavLink>
              <NavLink href="/erp/settings" icon={Settings}>Settings</NavLink>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {isAuthenticated && (
              <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
                <Search className="h-5 w-5" />
              </Button>
            )}
            <ThemeToggle />

            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-2">
                <UserMenu user={user} logout={logout} />
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button asChild variant="ghost" size="sm"><Link href="/login">Login</Link></Button>
                <Button asChild size="sm"><Link href="/register">Sign Up</Link></Button>
              </div>
            )}

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t"
          >
            <div className="px-4 py-4 space-y-3">
              {isAuthenticated ? (
                <>
                  <NavLink href="/erp" icon={LayoutDashboard} mobile onClick={() => setMobileMenuOpen(false)}>Dashboard</NavLink>
                  <NavLink href="/erp/settings" icon={Settings} mobile onClick={() => setMobileMenuOpen(false)}>Settings</NavLink>
                  <div className="border-t pt-4">
                    <UserMenu user={user} logout={logout} mobile />
                  </div>
                </>
              ) : (
                <>
                  <Button asChild className="w-full justify-start" variant="ghost"><Link href="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link></Button>
                  <Button asChild className="w-full justify-start"><Link href="/register" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link></Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <GlobalSearch open={searchOpen} setOpen={setSearchOpen} />
    </nav>
  );
}

const NavLink = ({ href, icon: Icon, children, mobile, onClick }: { href: string, icon: React.ComponentType<any>, children: React.ReactNode, mobile?: boolean, onClick?: () => void }) => (
  <Link
    href={href}
    onClick={onClick}
    className={`flex items-center gap-2 font-medium transition-colors ${mobile ? 'text-base p-2 rounded-md' : 'text-sm'} hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md`}
  >
    <Icon className="h-5 w-5" />
    <span>{children}</span>
  </Link>
);

const UserMenu = ({ user, logout, mobile }: { user: any, logout: () => void, mobile?: boolean }) => (
  <div className={mobile ? "space-y-2" : "flex items-center space-x-2"}>
    <Button asChild variant="ghost" size="sm" className={mobile ? "w-full justify-start" : ""}>
      <Link href="/account">
        <User className="h-4 w-4 mr-2" />
        {user?.name || user?.email?.split('@')[0]}
      </Link>
    </Button>
    <Button variant="ghost" size="sm" onClick={logout} className={mobile ? "w-full justify-start" : ""}>
      Logout
    </Button>
  </div>
);
