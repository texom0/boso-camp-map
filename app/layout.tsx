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

const siteTitle = "房総 CAMP FINDER｜千葉・房総のこだわりキャンプ場マップ検索";
const siteDescription =
  "千葉・房総エリアの隠れ家・穴場キャンプ場を条件指定でマップ検索。直火OK・ペット可・海が見えるなど、こだわりの条件で探して公式HP・予約ページへダイレクトアクセス。";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  keywords: [
    "房総",
    "キャンプ場",
    "千葉",
    "マップ検索",
    "直火OK",
    "ペット可",
    "海が見える",
    "隠れ家キャンプ場",
    "穴場キャンプ場",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    locale: "ja_JP",
    type: "website",
    siteName: "房総 CAMP FINDER",
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
