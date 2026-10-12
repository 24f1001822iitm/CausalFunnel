import Link from "next/link";

const features = [
  { title: "Fast setup", text: "Drop in one script tag and you are live in seconds." },
  { title: "Real insight", text: "See where visitors click and how far they scroll." },
  { title: "Privacy first", text: "No text content or form values are ever captured." },
];

const tiles = ["Coral", "Peach", "Mint", "Ocean", "Violet", "Midnight"];

export const metadata = { title: "Demo Store - Home" };

export default function DemoHome() {
  return (
    <main>
      <section className="demo-hero">
        <h1>Build something people love</h1>
        <p>A demo landing page for testing click and scroll tracking.</p>
        <button id="cta" className="demo-btn" type="button">Get started free</button>{" "}
        <Link href="/demo/pricing" className="demo-btn ghost">See pricing</Link>
      </section>

      <section className="demo-section">
        <h2>Features</h2>
        <div className="demo-grid">
          {features.map((f) => (
            <div className="demo-card" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <button type="button" className="demo-btn alt">Learn more</button>
            </div>
          ))}
        </div>
      </section>

      <section className="demo-section" style={{ background: "#f0f4ff", minHeight: 420 }}>
        <h2>Pick a color</h2>
        <div className="demo-grid">
          {tiles.map((t) => (
            <button type="button" className="demo-tile" key={t}>{t}</button>
          ))}
        </div>
      </section>

      <footer className="demo-footer">
        <p>(c) Acme Demo Store. All demo, no data.</p>
        <div className="demo-links">
          <Link href="/demo/pricing">Pricing</Link>
          <a href="/sessions">Dashboard</a>
        </div>
      </footer>
    </main>
  );
}
