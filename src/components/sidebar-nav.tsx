"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  ShoppingCart,
  Repeat,
  Calculator,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cards", label: "Cartões", icon: CreditCard },
  { href: "/purchases", label: "Compras", icon: ShoppingCart },
  { href: "/fixed-expenses", label: "Fixos", icon: Repeat },
  { href: "/simulate", label: "Simular", icon: Calculator },
  { href: "/settings/currencies", label: "Câmbio", icon: ArrowLeftRight },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-y-0 left-0 z-30 hidden w-48 flex-col gap-1 border-r bg-background p-4 md:flex">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
