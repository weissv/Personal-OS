import type { Metadata, Viewport } from "next";
import "./globals.css";

// Тот же шрифт, что и на mezon.uz (Mezon-Landing): единая типографика экосистемы
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
    <html lang="ru" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
