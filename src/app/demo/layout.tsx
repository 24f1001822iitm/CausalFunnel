import Script from "next/script";
import DemoNav from "./DemoNav";
import SessionBadge from "./SessionBadge";
import "./demo.css";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="demo-root">
      <DemoNav />
      {children}
      <SessionBadge />
      <Script src="/tracker.js" data-endpoint="/api/events" strategy="afterInteractive" />
    </div>
  );
}
