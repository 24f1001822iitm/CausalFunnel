"use client";

import { useEffect, useState } from "react";

export default function SessionBadge() {
  const [sid, setSid] = useState("");

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("cf_sid");
        const parsed = raw ? JSON.parse(raw) : null;
        setSid(parsed && typeof parsed.id === "string" ? parsed.id.slice(0, 8) : "");
      } catch {
        setSid("");
      }
    };
    read();
    const t = setInterval(read, 2000);
    return () => clearInterval(t);
  }, []);

  if (!sid) return null;
  return <div className="demo-badge">session: {sid}</div>;
}
