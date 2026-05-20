"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ReceiptText, Shield } from "lucide-react";

const items = [
  {
    href: "/",
    label: "\u9996\u9875",
    icon: Home,
  },
  {
    href: "/products",
    label: "\u5e02\u573a",
    icon: LayoutGrid,
  },
  {
    href: "/dashboard",
    label: "\u8ba2\u5355",
    icon: ReceiptText,
  },
  {
    href: "/admin",
    label: "\u5f00\u53d1",
    icon: Shield,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            className={isActive ? "mobile-nav-link active" : "mobile-nav-link"}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={2.4} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}