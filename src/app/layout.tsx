import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Event Buddy Map",
  description: "Find and join local study sessions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ margin: 0, background: '#f9fafb', minHeight: '100vh' }}
      >
        <style>{`
          .page-content { max-width: 720px; margin: 0 auto; padding: 24px; }
          @media (max-width: 640px) { .page-content { padding: 16px 12px; } }
        `}</style>
        <SessionProvider>
          <Header />
          <div className="page-content">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
