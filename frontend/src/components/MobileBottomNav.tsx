"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/", label: "Home",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/markets", label: "Markets",
    icon: (
      <svg viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round"/>
        <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round"/>
        <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/agents", label: "Agents",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" strokeLinecap="round"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/leaderboard", label: "Leaderboard",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M6 9H4.5C3.67 9 3 9.67 3 10.5V12C3 13.66 4.34 15 6 15V9Z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 9H19.5C20.33 9 21 9.67 21 10.5V12C21 13.66 19.66 15 18 15V9Z" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 22H6C6 20.9 6.9 20 8 20H16C17.1 20 18 20.9 18 22Z" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="8" y="2" width="8" height="13" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 20V15" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      <div className="nav-container">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive ? " active" : ""}`}
            >
              <div className="nav-icon">
                {item.icon}
              </div>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
