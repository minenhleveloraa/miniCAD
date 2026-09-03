"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Bell, FileCheck2, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type ReportAlertContextValue = {
  clearNewReports: () => void;
  newReportCount: number;
};

const ReportAlertContext = createContext<ReportAlertContextValue | null>(null);

export function ReportAlertProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const [newReportCount, setNewReportCount] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!isMounted) return;
        channel = supabase
          .channel("minicad:reports", { config: { private: true } })
          .on("broadcast", { event: "report-filed" }, () => {
            if (!pathnameRef.current.startsWith("/dashboard/reports")) {
              setNewReportCount((count) => count + 1);
            }
            setToastVisible(true);
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(() => setToastVisible(false), 6500);
          })
          .subscribe();
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
      if (toastTimer) clearTimeout(toastTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const value = useMemo(
    () => ({ clearNewReports: () => setNewReportCount(0), newReportCount }),
    [newReportCount],
  );

  return (
    <ReportAlertContext.Provider value={value}>
      {children}
      {toastVisible ? (
        <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-emerald-700/12 bg-white p-4 shadow-2xl sm:right-6 sm:bottom-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <FileCheck2 className="size-4.5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--ink)]">New report filed</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">An officer resolved an incident. The archived report is ready to review.</p>
              <Link href="/dashboard/reports" onClick={() => setNewReportCount(0)} className="mt-3 inline-flex text-xs font-bold text-[var(--coral)] hover:underline">
                Open reports
              </Link>
            </div>
            <button type="button" aria-label="Dismiss report notification" onClick={() => setToastVisible(false)} className="grid size-8 place-items-center rounded-full text-[var(--ink-muted)] hover:bg-[var(--ink)]/5 hover:text-[var(--ink)]">
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </ReportAlertContext.Provider>
  );
}

export function useReportAlerts() {
  const context = useContext(ReportAlertContext);
  if (!context) throw new Error("useReportAlerts must be used inside ReportAlertProvider.");
  return context;
}

export function ReportAlertBell() {
  const { clearNewReports, newReportCount } = useReportAlerts();

  return (
    <Link href="/dashboard/reports" onClick={clearNewReports} aria-label={newReportCount ? `${newReportCount} new incident reports` : "Incident reports"} className="relative grid size-10 place-items-center rounded-full border border-[var(--ink)]/8 bg-white text-[var(--ink-muted)] transition-colors hover:border-[var(--coral)]/25 hover:text-[var(--coral)]">
      <Bell className="size-4" strokeWidth={1.9} />
      {newReportCount ? (
        <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-[var(--coral)] px-1 text-[0.625rem] font-bold leading-5 text-white">
          {newReportCount > 9 ? "9+" : newReportCount}
        </span>
      ) : null}
    </Link>
  );
}
