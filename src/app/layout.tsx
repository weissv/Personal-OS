import type { Metadata, Viewport } from "next";
import "./globals.css";

// Тот же шрифт, что и на mezon.uz (Mezon-Landing): единая типографика экосистемы
export const metadata: Metadata = {
  title: {
    default: "Sprint OS · Mezon Inspiring School",
    template: "%s · Sprint OS",
  },
  description: "Sprint OS — продолжение школы Mezon Inspiring School (Ташкент): ежедневник субъектности, 10-недельный спринт и цикл PDCA. Часть экосистемы mezon.uz.",
  applicationName: "Mezon Sprint OS",
  // Личные данные учеников: не индексировать и не показывать превью
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mezon Sprint OS",
  },
};

// Масштабирование не блокируем (WCAG 1.4.4): ученику со слабым зрением нужно увеличивать текст.
// Авто-зум iOS при фокусе на поле предотвращается размером шрифта полей ≥ 16px.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        {/* Тот же Roboto, что на mezon.uz. next/font ломал сборку Turbopack с кастомным CSS-лоадером. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
