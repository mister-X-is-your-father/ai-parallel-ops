import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Ops",
  description: "Parallel AI supervision dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <div className="crt-overlay" />
        <div className="crt-vignette" />
        {children}
      </body>
    </html>
  );
}
