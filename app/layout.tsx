import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import FloatingAI from "./components/FloatingAI";

export const metadata: Metadata = {
  title: "PromptBay",
  description: "AI工具 · 数字商品 · 智能体部署"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
        <FloatingAI />
        <MobileNav />
      </body>
      
    </html>
    
  );
}