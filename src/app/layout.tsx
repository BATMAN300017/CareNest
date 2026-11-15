import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CareNest Health – Senior Care & Medication Platform",
  description:
    "Smart, interconnected elderly healthcare management and medication adherence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="bg-background text-on-surface antialiased min-h-screen selection:bg-primary-fixed selection:text-on-primary-fixed">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
