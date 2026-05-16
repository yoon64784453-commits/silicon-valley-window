
import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "PromptBay｜数字商城",
  description: "一个用于销售 AI 提示词、智能体模板、高效办公模板、课程资料与数字素材的虚拟产品商城 MVP。"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Navbar />
        {children}
        <footer className="footer">
          <div className="container">© 2026 硅谷之窗 · 打开一扇窗，看见 AI 时代的新机会。</div>
        </footer>
      </body>
    </html>
  );
}
