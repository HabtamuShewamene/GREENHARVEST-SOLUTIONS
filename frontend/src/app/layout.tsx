import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Anton } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

const anton = Anton({
  subsets: ["latin"],
  variable: "--font-anton",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Farmhub - Agritech and E-Groceries",
  description: "Agritech platform connecting farmers with customers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${anton.variable}`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning className="bg-background text-on-surface font-body antialiased overflow-x-hidden selection:bg-primary-container selection:text-on-primary">
        {children}
      </body>
    </html>
  );
}
