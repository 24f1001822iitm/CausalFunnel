import Link from "next/link";

export default function DemoNav() {
  return (
    <nav className="demo-nav" aria-label="Demo navigation">
      <span className="brand">Acme Demo Store</span>
      <Link href="/demo">Home</Link>
      <Link href="/demo/pricing">Pricing</Link>
      <a href="/demo/pricing">Pricing (full reload)</a>
      <span className="spacer" />
      <a href="/sessions">Back to dashboard</a>
    </nav>
  );
}
