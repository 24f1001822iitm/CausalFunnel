import Link from "next/link";

const plans = [
  { name: "Starter", price: "$0", text: "For hobby projects." },
  { name: "Pro", price: "$29", text: "For growing teams.", featured: true },
  { name: "Scale", price: "$99", text: "For serious traffic." },
];

const faqs = ["Can I cancel anytime?", "Do you offer refunds?", "Is there a free trial?", "How is data stored?"];

export const metadata = { title: "Demo Store - Pricing" };

export default function PricingPage() {
  return (
    <main>
      <section className="demo-section demo-sec-a">
        <h2>Simple pricing</h2>
        <div className="demo-grid">
          {plans.map((p) => (
            <div className={`demo-card${p.featured ? " featured" : ""}`} key={p.name}>
              <h3>{p.name}</h3>
              <p className="demo-price">{p.price}<small>/mo</small></p>
              <p>{p.text}</p>
              <button type="button" className="demo-btn">Choose {p.name}</button>
            </div>
          ))}
        </div>
      </section>

      <section className="demo-section demo-sec-b">
        <h2>Compare features</h2>
        <div className="demo-grid">
          {["Analytics", "Heatmaps", "Exports", "Support"].map((f) => (
            <div className="demo-card" key={f}>
              <h3>{f}</h3>
              <p>Included in Pro and Scale.</p>
              <button type="button" className="demo-btn alt">Details</button>
            </div>
          ))}
        </div>
      </section>

      <section className="demo-section demo-sec-c">
        <h2>Frequently asked</h2>
        <div className="demo-grid">
          {faqs.map((q) => (
            <button type="button" className="demo-tile" key={q}>{q}</button>
          ))}
        </div>
      </section>

      <section className="demo-section demo-sec-d">
        <h2>Ready when you are</h2>
        <div className="demo-links">
          <button type="button" className="demo-btn">Start trial</button>
          <button type="button" className="demo-btn alt">Talk to sales</button>
          <Link href="/demo" className="demo-btn ghost">Back to demo home</Link>
        </div>
      </section>

      <footer className="demo-footer">
        <div className="demo-links">
          <Link href="/demo">Back to /demo</Link>
          <a href="/sessions">Dashboard</a>
        </div>
      </footer>
    </main>
  );
}
