import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saathi - Find your life partner",
  description: "A modern matrimony platform to discover, connect, and chat with verified profiles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
