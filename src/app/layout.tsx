import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Agency Command Center",
  description: "Internal operations hub for cold email agency management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
