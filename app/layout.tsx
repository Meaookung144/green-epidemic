import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { Providers } from "@/components/Providers";
import AppLayout from "@/components/AppLayout";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({ 
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Green Epidemic - Environmental & Health Monitoring",
  description: "Monitor PM2.5, COVID-19, flu spread, and weather conditions in your area",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={ibmPlexSansThai.className}>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}