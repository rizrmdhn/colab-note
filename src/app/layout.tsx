import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "@/components/ui/sonner";
import Providers from "./provider";

export const metadata: Metadata = {
  title: "Login - Collaborative Note Taking",
  description:
    "Colab Note is a collaborative note taking app created with Next.js and Tailwind CSS.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
  sheet,
}: Readonly<{ children: React.ReactNode; sheet: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* <script src="https://unpkg.com/react-scan/dist/auto.global.js" async /> */}
        {/* rest of your scripts go under */}
      </head>
      <body>
        <TRPCReactProvider>
          <Providers>
            {children}
            {sheet}
            <div id="sheet-root" />
            <Toaster position="bottom-right" richColors />
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
