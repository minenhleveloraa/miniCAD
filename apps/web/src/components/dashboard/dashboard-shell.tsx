import type { ReactNode } from "react";
import { LogOut } from "lucide-react";

import { signOut } from "@/app/dashboard/actions";
import { BrandMark } from "@/components/brand-mark";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ReportAlertBell, ReportAlertProvider } from "@/components/dashboard/report-alert-provider";

type DashboardShellProps = {
  children: ReactNode;
  email: string;
};

export function DashboardShell({ children, email }: DashboardShellProps) {
  const userInitial = email.charAt(0).toUpperCase();

  return (
    <ReportAlertProvider>
      <main className="min-h-svh bg-[var(--cream)] text-[var(--ink)] lg:grid lg:grid-cols-[16rem_1fr]">
        <AppSidebar />

      <div className="min-w-0">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-[var(--ink)]/8 bg-[var(--cream-light)] px-5 py-4 sm:px-8 lg:min-h-24 lg:px-10">
          <div className="lg:hidden">
            <BrandMark compact />
          </div>
          <p className="sr-only text-xl font-semibold tracking-[-0.025em] sm:not-sr-only sm:block lg:text-2xl">
            Operations dashboard
          </p>

          <div className="flex min-w-0 items-center gap-3">
            <ReportAlertBell />
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--ink)]/8 bg-white text-sm font-bold text-[var(--coral)]">
              {userInitial}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block text-xs font-semibold text-[var(--ink-soft)]">Dispatcher</span>
              <span className="block max-w-48 truncate text-xs text-[var(--ink-muted)]" title={email}>
                {email}
              </span>
            </span>
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="grid size-10 place-items-center rounded-full border border-[var(--ink)]/8 bg-white text-[var(--ink-muted)] transition-colors hover:border-[var(--coral)]/25 hover:text-[var(--coral)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
              >
                <LogOut className="size-4" strokeWidth={1.9} />
              </button>
            </form>
          </div>
        </header>

        {children}
      </div>
      </main>
    </ReportAlertProvider>
  );
}
