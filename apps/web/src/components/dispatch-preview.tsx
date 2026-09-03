import {
  BellRing,
  ChevronRight,
  Clock3,
  MapPin,
  Radio,
  Route,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

const units = [
  { name: "N. Dlamini", badge: "U-12", status: "Available", color: "emerald" },
  { name: "A. Jacobs", badge: "U-07", status: "Responding", color: "amber" },
  { name: "T. Mokoena", badge: "U-19", status: "Available", color: "emerald" },
] as const;

export function DispatchPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[680px] lg:mx-0 lg:justify-self-end">
      <div className="preview-orbit preview-orbit-one" aria-hidden="true" />
      <div className="preview-orbit preview-orbit-two" aria-hidden="true" />

      <div className="relative rounded-[2rem] border border-white/80 bg-white/75 p-2 shadow-[0_38px_100px_-40px_rgba(7,30,50,0.45)] backdrop-blur-xl sm:rounded-[2.5rem] sm:p-3">
        <div className="overflow-hidden rounded-[1.55rem] border border-slate-900/8 bg-[#071e32] sm:rounded-[2rem]">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-4 text-white sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="size-2 rounded-full bg-[#ff6a62]" />
                <span className="size-2 rounded-full bg-[#ffd166]" />
                <span className="size-2 rounded-full bg-[#31d0aa]" />
              </div>
              <span className="hidden h-4 w-px bg-white/10 sm:block" />
              <span className="hidden text-[0.65rem] font-bold tracking-[0.18em] text-slate-400 uppercase sm:inline">
                Live desk 01
              </span>
            </div>
            <div className="flex items-center gap-2 text-[0.68rem] font-bold text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Realtime synced
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.18fr_0.82fr]">
            <div className="preview-map relative min-h-[390px] overflow-hidden p-4 sm:min-h-[450px] sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(49,208,170,0.09),transparent_38%)]" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[0.62rem] font-bold tracking-[0.18em] text-cyan-200/60 uppercase">
                    Active incident
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">Central district</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[0.65rem] font-bold text-slate-300">
                  <Clock3 className="size-3" /> 14:32:08
                </div>
              </div>

              <div className="absolute top-[36%] left-[46%]" aria-hidden="true">
                <span className="absolute -inset-6 animate-ping rounded-full border border-red-400/25 motion-reduce:animate-none" />
                <span className="absolute -inset-3 rounded-full bg-red-400/10" />
                <span className="relative grid size-9 place-items-center rounded-full border-4 border-[#071e32] bg-[var(--red)] text-white shadow-xl shadow-red-950/50">
                  <MapPin className="size-4" fill="currentColor" />
                </span>
              </div>

              <div className="absolute right-[12%] bottom-[30%] size-3 rounded-full border-2 border-[#071e32] bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.08)]" />
              <div className="absolute bottom-[41%] left-[18%] size-3 rounded-full border-2 border-[#071e32] bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.08)]" />

              <article className="absolute inset-x-4 bottom-4 rounded-[1.35rem] border border-white/10 bg-[#0d2b45]/92 p-4 text-white shadow-2xl backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-red-400/15 px-2.5 py-1 text-[0.6rem] font-black tracking-[0.13em] text-red-300 uppercase">
                        High priority
                      </span>
                      <span className="font-mono text-[0.65rem] text-slate-400">INC-2048</span>
                    </div>
                    <h2 className="mt-3 text-lg font-black tracking-[-0.03em]">
                      Medical assistance
                    </h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                      <MapPin className="size-3.5 text-cyan-300" /> 18 Long Street, Central
                    </p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/7">
                    <ChevronRight className="size-4" />
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[0.62rem] font-bold">
                  <span className="rounded-lg bg-cyan-300/12 py-2 text-cyan-200">Dispatched</span>
                  <span className="rounded-lg bg-white/5 py-2 text-slate-500">Claimed</span>
                  <span className="rounded-lg bg-white/5 py-2 text-slate-500">En route</span>
                </div>
              </article>
            </div>

            <aside className="border-t border-white/8 bg-white/[0.035] p-4 sm:p-6 lg:border-t-0 lg:border-l">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.62rem] font-bold tracking-[0.17em] text-slate-500 uppercase">
                    Officer pool
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">3 units on duty</p>
                </div>
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <Radio className="size-4" />
                </span>
              </div>

              <div className="mt-5 space-y-2.5">
                {units.map((unit) => (
                  <div
                    key={unit.badge}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/7 text-slate-200">
                      <UserRoundCheck className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">{unit.name}</p>
                      <p className="mt-0.5 font-mono text-[0.6rem] text-slate-500">{unit.badge}</p>
                    </div>
                    <span
                      className={`size-2 rounded-full ${
                        unit.color === "emerald" ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                      aria-label={unit.status}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-cyan-300/10 bg-cyan-300/6 p-3.5">
                <div className="flex items-center gap-2 text-[0.67rem] font-bold text-cyan-100">
                  <BellRing className="size-3.5 text-cyan-300" />
                  Broadcast ready
                </div>
                <p className="mt-1.5 text-[0.62rem] leading-4 text-slate-400">
                  Available units will receive the dispatch simultaneously.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[0.62rem] font-semibold text-slate-500">
                <ShieldCheck className="size-3.5" /> Secured by role
                <span className="ml-auto flex items-center gap-1 text-emerald-300">
                  <Route className="size-3.5" /> Live
                </span>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
