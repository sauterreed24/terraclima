import { useMemo } from "react";
import { Gauge, MapPinned, ShieldAlert, Sparkles } from "lucide-react";
import type { Place } from "../../types";
import { scorePlaceFeel } from "../../lib/place-feel";
import { useProse } from "../../lib/units";

function toneFor(value: number): "sage" | "ice" | "ember" {
  if (value >= 74) return "sage";
  if (value >= 58) return "ice";
  return "ember";
}

export function PlaceFeelRead({ place, anchorId }: { place: Place; anchorId: string }) {
  const prose = useProse();
  const feel = useMemo(() => scorePlaceFeel(place), [place]);

  return (
    <details id={anchorId} className="place-score-details detail-doc-section anim-fade-in scroll-mt-28">
      <summary className="place-score-details__summary">
        <Gauge className="w-4 h-4 shrink-0" style={{ color: "#c7b5ea" }} aria-hidden />
        Place feel
      </summary>

      <div className="place-score-details__body">
      <div className="grid lg:grid-cols-[13rem_1fr] gap-3">
        <div className="panel-thin p-4">
          <div className="text-[10px] uppercase tracking-wider text-stone">Actual-place rating</div>
          <div className="font-mono-num text-4xl text-ice mt-1">
            {feel.score}<span className="text-sm text-stone">/100</span>
          </div>
          <div className="mt-2 chip" data-tone={toneFor(feel.score)}>
            {feel.band}
          </div>
          <p className="text-sm text-frost leading-relaxed mt-3">{prose(feel.summary)}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {feel.components.map(component => (
            <article key={component.key} className="panel-thin p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-wider text-stone">{component.label}</div>
                <div className="font-mono-num text-sm text-ice tabular-nums">{Math.round(component.value)}</div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[rgba(200,170,140,0.22)] overflow-hidden" aria-hidden>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(component.value)}%`,
                    background:
                      component.value >= 74
                        ? "linear-gradient(90deg, #88b87f, #c6dcbd)"
                        : component.value >= 58
                          ? "linear-gradient(90deg, #5ec4dc, #c3e4f1)"
                          : "linear-gradient(90deg, #d37c5b, #f0c2a8)",
                  }}
                />
              </div>
              <p className="text-[12px] text-stone-readable leading-relaxed mt-2">{prose(component.rationale)}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <div className="panel-thin p-4 border-l-2" style={{ borderLeftColor: "#c6dcbd" }}>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone mb-2">
            <Sparkles className="w-4 h-4" aria-hidden />
            What carries the feel
          </div>
          <ul className="space-y-1.5 text-sm text-frost">
            {feel.strengths.map(item => <li key={item}>{prose(item)}</li>)}
          </ul>
        </div>
        <div className="panel-thin p-4 border-l-2" style={{ borderLeftColor: "#d37c5b" }}>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone mb-2">
            <ShieldAlert className="w-4 h-4" aria-hidden />
            Verify in person
          </div>
          <ul className="space-y-1.5 text-sm text-frost">
            {feel.frictions.map(item => <li key={item}>{prose(item)}</li>)}
          </ul>
        </div>
      </div>

      <p className="text-[11px] text-stone italic mt-2 flex items-center gap-1.5">
        <MapPinned className="w-3.5 h-3.5" aria-hidden />
        Derived from authored corpus texture, comfort signals, lived friction, risk load, and scouting anchors.
      </p>
      </div>
    </details>
  );
}
