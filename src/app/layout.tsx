import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Sonexa Music",
  description: "Admin dashboard for Sonexa Music platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} flex h-screen overflow-hidden antialiased bg-background text-foreground`}>
        <div className="hidden md:flex h-full">
          <Sidebar />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden w-full">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
