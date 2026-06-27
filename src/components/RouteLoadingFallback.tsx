interface Props {
  label: string;
}

export function RouteLoadingFallback({ label }: Props) {
  return (
    <div className="panel p-5 anim-fade-in" role="status" aria-live="polite" aria-atomic="true">
      <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-stone-readable">Loading view</p>
      <h2 className="m-0 mt-1 font-atlas text-xl text-ice">{label}</h2>
      <p className="m-0 mt-3 text-sm leading-relaxed text-stone-readable">
        Preparing {label.toLowerCase()}…
      </p>
      <div className="mt-6 grid gap-3" aria-hidden="true">
        <div className="h-3 w-3/4 rounded-full bg-white/10" />
        <div className="h-3 w-full rounded-full bg-white/10" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-lg border border-white/10 bg-white/[0.04]" />
          <div className="h-28 rounded-lg border border-white/10 bg-white/[0.04]" />
        </div>
        <div className="h-24 rounded-lg border border-white/10 bg-white/[0.04]" />
      </div>
    </div>
  );
}
