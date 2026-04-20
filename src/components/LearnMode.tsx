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
      <div className="panel p-4 border-[rgba(26,143,168,0.22)]">
        <div className="text-xs uppercase tracking-wider text-stone mb-1">Start here</div>
        <h3 className="font-atlas text-lg text-ice mb-2">How to read every location in the atlas</h3>
        <ol className="text-sm text-frost leading-relaxed list-decimal pl-5 space-y-1.5">
          <li>Go to <span className="text-ice font-medium">Explorer</span>, then open any place from the map or the card list.</li>
          <li>In the profile, read top to bottom, or use <span className="text-ice font-medium">On this page</span> to jump — same content, less scrolling.</li>
          <li>Use <span className="text-ice font-medium">Search</span> and <span className="text-ice font-medium">Rank by</span> in the sidebar to reorder or narrow the list; the map always shows the same filtered set.</li>
          <li>Come back to <span className="text-ice font-medium">Learn</span> for vocabulary (rain shadow, chinook, etc.) and example places linked under each term.</li>
        </ol>
      </div>
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

      <div className="panel p-4 border-[rgba(232,155,32,0.2)]">
        <div className="text-xs uppercase tracking-wider text-stone mb-1">Classification frame</div>
        <h3 className="font-atlas text-lg text-ice mb-2">Five families of physical drivers</h3>
        <p className="text-sm text-frost leading-relaxed mb-3">
          Every stop in the atlas is tagged by the mechanisms that make local weather diverge from the regional average. Grouping drivers this way keeps comparisons honest when you move from, say, a rain-shadow desert to a fog belt or a tropical highland.
        </p>
        <dl className="space-y-2.5 text-sm">
          <div className="border-l-2 border-[rgba(232,155,32,0.45)] pl-3">
            <dt className="font-semibold text-ice">Topography &amp; elevation</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Sky islands, thermal belts, rain shadows and foehn, slope aspect, cold-air drainage, gap winds — terrain rewrites temperature, moisture, and wind speed.
            </dd>
          </div>
          <div className="border-l-2 border-[rgba(26,143,168,0.4)] pl-3">
            <dt className="font-semibold text-ice">Hydrological</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Oceans and cold currents, lakes (moderation and lake-effect snow), rivers and wetlands — water stores heat and moisture differently than land.
            </dd>
          </div>
          <div className="border-l-2 border-[rgba(61,143,85,0.4)] pl-3">
            <dt className="font-semibold text-ice">Vegetation &amp; soil</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Forest canopies (phytoclimates), soil drainage, karst — the surface cover and substrate change humidity, frost, and how water moves.
            </dd>
          </div>
          <div className="border-l-2 border-[rgba(224,77,122,0.35)] pl-3">
            <dt className="font-semibold text-ice">Urban &amp; built form</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Heat islands from paving and rooftops; wind channeling in street canyons; altered drainage — cities overlay their own microclimates on natural ones.
            </dd>
          </div>
          <div className="border-l-2 border-[rgba(90,79,71,0.35)] pl-3">
            <dt className="font-semibold text-ice">Subterranean &amp; shelter</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Caves, deep ravines, and frost hollows — highly sheltered volumes where temperature and air stagnation decouple from the free atmosphere.
            </dd>
          </div>
        </dl>
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
