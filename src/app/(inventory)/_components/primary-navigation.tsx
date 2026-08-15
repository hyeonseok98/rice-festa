import { Archive, ClipboardCheck, PackageSearch, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  { href: '/products', label: '출품작', icon: PackageSearch },
  { href: '/storage', label: '보관 위치', icon: Archive },
  { href: '/picking', label: '품평회 준비', icon: ClipboardCheck },
];

export function DesktopPrimaryNavigation({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="주요 메뉴" className="hidden h-17 items-stretch md:flex">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center whitespace-nowrap border-b-3 px-4 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-inset focus-visible:outline-primary lg:px-5 ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobilePrimaryNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 grid h-18 grid-cols-3 border-t border-border bg-surface md:hidden"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-semibold focus-visible:outline-3 focus-visible:outline-inset focus-visible:outline-primary ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.5 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
