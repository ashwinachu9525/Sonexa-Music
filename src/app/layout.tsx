import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/next";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`flex h-screen overflow-hidden antialiased bg-background text-foreground`} suppressHydrationWarning>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
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
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
