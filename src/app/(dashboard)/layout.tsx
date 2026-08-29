import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/logout-button';

// proxy.ts guards everything under this group at the request level (redirects to /login when
// neither session cookie is present) - this layout is just the shared nav shell. Plain
// { children: ReactNode } rather than a typed LayoutProps<'/...'> helper, since this one layout
// serves three different leaf routes (/account, /subscription, /keys), not a single route.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/account" className="hover:underline">
              Account
            </Link>
            <Link href="/subscription" className="hover:underline">
              Subscription
            </Link>
            <Link href="/keys" className="hover:underline">
              Keys
            </Link>
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
