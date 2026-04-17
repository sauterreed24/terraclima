import { CONCEPTS } from "../data/glossary";
import { PLACES_BY_ID } from "../data/places";
import { motion } from "framer-motion";
import { BookOpen, Compass } from "lucide-react";
import { useProse } from "../lib/units";

interface Props {
  onOpenPlace: (id: string) => void;
}

export function LearnMode({ onOpenPlace }: Props) {
  const prose = useProse();
  return (
    <div className="space-y-4">
      <div className="panel-warm p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 mt-1" style={{ color: "#f0d29c" }} />
          <div>
            <div className="text-xs uppercase tracking-wider text-stone">Atlas learning mode</div>
            <h3 className="font-atlas text-xl text-ice mb-1.5">How terrain writes the weather</h3>
            <p className="text-sm text-frost leading-relaxed">
              Terraclima is built on the simple idea that climate is not flat. Mountains block, shadow, shelter, and channel. Water moderates. Elevation cools. Aspect tilts the sun. Every place on this atlas carries the fingerprint of its local terrain and position — and reading those fingerprints lets you discover climates hiding in plain sight.
            </p>
            <p className="text-xs text-stone mt-2 italic">Click any example city below to open its full profile.</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {CONCEPTS.map(c => (
          <motion.div
            key={c.id}
            layout
            whileHover={{ y: -2 }}
            className="panel p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-3.5 h-3.5" style={{ color: "#8cc8e0" }} />
              <h4 className="font-atlas text-lg text-ice">{c.term}</h4>
            </div>
            <div className="text-sm text-frost italic mb-1.5">{prose(c.short)}</div>
            <p className="text-sm text-frost leading-relaxed">{prose(c.long)}</p>
            {c.mechanism && (
              <div className="panel-thin p-2.5 mt-2 border-l-2" style={{ borderLeftColor: "#f0d29c" }}>
                <div className="text-[10px] uppercase tracking-wider text-stone">Mechanism</div>
                <div className="text-xs text-ice mt-0.5">{prose(c.mechanism)}</div>
              </div>
            )}
            {c.exampleIds && c.exampleIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 items-center">
                <div className="text-[10px] uppercase tracking-wider text-stone mr-1">See it here:</div>
                {c.exampleIds.map(id => {
                  const p = PLACES_BY_ID[id];
                  if (!p) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => onOpenPlace(id)}
                      className="chip chip-btn"
                      data-tone="glacier"
                      title={`Open ${p.name}`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
