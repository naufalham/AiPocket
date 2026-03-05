"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/", label: "Dashboard",
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "22px", height: "22px" }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    href: "/markets", label: "Markets",
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "22px", height: "22px" }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    href: "/agents", label: "Agents",
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: "22px", height: "22px" }}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/></svg>,
  },
  {
    href: "/leaderboard", label: "Leaderboard",
    svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: "22px", height: "22px" }}><path d="M6 9H4.5C3.67 9 3 9.67 3 10.5V12C3 13.66 4.34 15 6 15V9Z"/><path d="M18 9H19.5C20.33 9 21 9.67 21 10.5V12C21 13.66 19.66 15 18 15V9Z"/><path d="M18 22H6C6 20.9 6.9 20 8 20H16C17.1 20 18 20.9 18 22Z"/><rect x="8" y="2" width="8" height="13" rx="1"/><path d="M12 20V15"/></svg>,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(26,26,46,0.97)", backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(0,245,255,0.2)",
      padding: "8px 0 max(12px, env(safe-area-inset-bottom))",
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
            color: isActive ? "var(--electric-cyan)" : "var(--text-muted)",
            textDecoration: "none", fontSize: "10px", padding: "8px 4px",
            fontFamily: "var(--font-ibm-plex-mono)",
            filter: isActive ? "drop-shadow(0 0 6px rgba(0,245,255,0.7))" : "none",
            transition: "color 0.3s",
          }}>
            {item.svg}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
