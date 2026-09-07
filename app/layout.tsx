import type { Metadata } from "next";
import { Montserrat, Noto_Sans_JP, Zen_Kaku_Gothic_Antique } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
});

const zenKaku = Zen_Kaku_Gothic_Antique({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-zen-kaku",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-montserrat",
});

const siteTitle = "房総キャンプ場マップ | 君津・木更津・富津エリア";
const siteDescription =
  "千葉県房総エリア（君津・木更津・富津など）のキャンプ場を網羅したインタラクティブマップ。設備や利用スタイルから簡単に検索できます。";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "cg69XEUKHVIJa4yGcxWl-XA9efQWYiJWVFFJ6i6pV1Y",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${zenKaku.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
