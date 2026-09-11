'use client';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarNav, Topbar } from './sidebar-nav';
import { getAccessToken } from '@/lib/api';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoginPage && !getAccessToken()) {
      router.push('/login');
    }
  }, [isLoginPage, pathname, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      {/* Backdrop overlay untuk mobile drawer */}
      <div
        className={`sidebar-backdrop ${mobileNavOpen ? 'active' : ''}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />
      <SidebarNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="main-wrapper">
        <Topbar onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)} />
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
