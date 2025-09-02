import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeModeProvider } from '@/context/ThemeContext';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bank Transaction Manager",
  description: "Manage your bank accounts, transactions, and financial analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} antialiased`}>
          <ThemeModeProvider>
            {children}
          </ThemeModeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
