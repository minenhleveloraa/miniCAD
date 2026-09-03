"use client";

import Link from "next/link";
import { FileText, LayoutDashboard, Siren, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { useReportAlerts } from "@/components/dashboard/report-alert-provider";

const navigationItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Incidents", icon: Siren, href: "/dashboard/incidents/new" },
  { label: "Officers", icon: UsersRound, href: "/dashboard/officers" },
  { label: "Reports", icon: FileText, href: "/dashboard/reports" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { clearNewReports, newReportCount } = useReportAlerts();

  return (
    <aside className="border-b border-[var(--ink)]/8 bg-[var(--cream-light)] lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-64 lg:flex-col lg:border-r lg:border-b-0">
      <div className="hidden h-24 items-center px-7 lg:flex">
        <BrandMark />
      </div>

      <nav
        aria-label="Dashboard navigation"
        className="flex gap-2 overflow-x-auto px-5 py-3 sm:px-8 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4 lg:py-6"
      >
        {navigationItems.map(({ label, icon: Icon, href }) => {
          const active =
            href === "/dashboard" ? pathname === href : Boolean(href && pathname.startsWith(href));
          const className = `inline-flex h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-colors lg:w-full ${
            active
              ? "bg-[var(--coral)]/9 text-[var(--coral)]"
              : href
                ? "text-[var(--ink-muted)] hover:bg-white hover:text-[var(--ink)]"
                : "cursor-not-allowed text-[var(--ink-muted)] opacity-55"
          }`;

          if (href) {
            return (
              <Link
                key={label}
                href={href}
                onClick={label === "Reports" ? clearNewReports : undefined}
                aria-current={active ? "page" : undefined}
                className={className}
              >
                <Icon className="size-4.5" strokeWidth={1.9} />
                {label}
                {label === "Reports" && newReportCount ? (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-[var(--coral)] px-1 text-[0.625rem] leading-5 text-white">
                    {newReportCount > 9 ? "9+" : newReportCount}
                  </span>
                ) : null}
              </Link>
            );
          }

          return (
            <button key={label} type="button" disabled className={className}>
              <Icon className="size-4.5" strokeWidth={1.9} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="hidden border-t border-[var(--ink)]/8 p-5 lg:block">
        <p className="text-xs font-semibold text-[var(--ink-soft)]">MiniCAD workspace</p>
        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
          Incident logging, officer duty, dispatch, and first-claim ownership share one live Supabase record.
        </p>
      </div>
    </aside>
  );
}
