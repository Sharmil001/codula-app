'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, GitPullRequest } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    name: 'Home',
    href: '/',
    icon: Home,
  },
  {
    name: 'PR Analyzer',
    href: '/pr-analyzer',
    icon: GitPullRequest,
  },
];

export function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
      <div className="flex items-center justify-around max-w-md mx-auto px-4 py-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground'
              )}
            >
              <Icon 
                className={cn(
                  'h-5 w-5 transition-all duration-200',
                  isActive ? 'scale-110' : 'scale-100'
                )} 
              />
              <span 
                className={cn(
                  'text-xs font-medium mt-1 transition-all duration-200',
                  isActive ? 'opacity-100' : 'opacity-70'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}