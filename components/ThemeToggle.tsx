"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("dataset-explorer-theme", theme);
    } catch {}
  }

  return (
    <button
      type="button"
      className="btn theme-btn"
      onClick={toggle}
      aria-label="Toggle color theme"
    >
      {dark ? "☀️ Light mode" : "🌙 Dark mode"}
    </button>
  );
}