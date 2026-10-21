import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

// Тот же шрифт, что и на mezon.uz (Mezon-Landing): единая типографика экосистемы
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MEZON SPRINT OS | Личная операционная система ученика",
  description: "Sprint OS — продолжение школы Mezon Inspiring School (Ташкент): ежедневник субъектности, 10-недельный спринт и цикл PDCA. Часть экосистемы mezon.uz.",
  applicationName: "Mezon Sprint OS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mezon Sprint OS",
  },
  icons: {
    icon: "/brand/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${roboto.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
