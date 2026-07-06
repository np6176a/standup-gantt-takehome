import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/stores/StoreProvider";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Standup Gantt Takehome",
  description: "Build a per-person Gantt of Linear issues and GitHub pull requests.",
};

// Applies the persisted theme/accent before first paint to avoid a flash of the
// wrong theme. Kept in sync afterwards by StoreProvider. Mirrors the storage keys
// and fallbacks in stores/rootStore.ts.
const noFlashScript = `
(function () {
  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  var t = read('standup-gantt.theme');
  if (t !== 'light' && t !== 'dark') {
    try {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) { t = 'light'; }
  }
  var a = read('standup-gantt.accent') || 'indigo';
  try {
    var root = document.documentElement;
    if (t === 'dark') root.classList.add('dark');
    root.dataset.accent = a;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
