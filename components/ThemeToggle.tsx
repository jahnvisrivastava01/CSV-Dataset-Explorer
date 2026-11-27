"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage can be unavailable */
    }
  }

  return (
    <button className="btn" onClick={toggle} aria-label="Toggle light and dark theme">
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
