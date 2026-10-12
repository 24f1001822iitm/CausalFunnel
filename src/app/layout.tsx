import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CausalFunnel Analytics",
  description: "User session and click heatmap analytics",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/sessions" className="brand">CausalFunnel</Link>
            <nav className="nav">
              <Link href="/sessions" className="nav-link">Sessions</Link>
              <Link href="/heatmap" className="nav-link">Heatmap</Link>
              <Link href="/demo" className="nav-link">Demo</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
