import { COLLECTIONS } from "../data/collections";
import { PLACES_BY_ID } from "../data/places";
import { motion } from "framer-motion";
import { useProse } from "../lib/units";

interface Props {
  onOpenPlace: (id: string) => void;
  onPick: (id: string) => void;
  activeId?: string;
}

export function CollectionsView({ onOpenPlace, onPick, activeId }: Props) {
  const prose = useProse();
  return (
    <div className="space-y-5">
      {COLLECTIONS.map(c => {
        const isActive = c.id === activeId;
        return (
          <motion.div
            key={c.id}
            layout
            className={`panel p-4 anim-fade-in ${isActive ? "glow-glacier" : ""}`}
            style={isActive ? { borderColor: "rgba(140,200,224,0.75)" } : undefined}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-stone">{c.subtitle}</div>
                <h3 className="font-atlas text-xl text-ice">{c.title}</h3>
                <div className="text-[11px] text-stone mt-0.5">{c.placeIds.length} places</div>
              </div>
              <button
                type="button"
                onClick={() => onPick(c.id)}
                className={isActive ? "btn-primary !text-xs !py-1.5" : "btn-ghost !text-xs"}
                aria-pressed={isActive}
              >
                {isActive ? "Pinned" : "Pin collection"}
              </button>
            </div>
            <p className="text-sm text-frost leading-relaxed mb-3">{prose(c.description)}</p>
            <div className="flex flex-wrap gap-1.5">
              {c.placeIds.map(id => {
                const p = PLACES_BY_ID[id];
                if (!p) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onOpenPlace(id)}
                    className="chip chip-btn"
                    data-tone={c.tone}
                    title={`Open ${p.name}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
