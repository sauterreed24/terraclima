import { CONCEPTS } from "../data/glossary";
import { PLACES_BY_ID } from "../data/places";
import { BookOpen, Compass } from "lucide-react";
import { useProse } from "../lib/units";

interface Props {
  onOpenPlace: (id: string, opts?: { trigger?: HTMLElement | null }) => void;
}

const PLACE_COUNT = Object.keys(PLACES_BY_ID).length;

export function LearnMode({ onOpenPlace }: Props) {
  const prose = useProse();
  return (
    <div className="space-y-4">
      <div className="panel-warm p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 mt-1" style={{ color: "#f0d29c" }} aria-hidden />
          <div>
            <div className="text-xs uppercase tracking-wider text-stone">The idea</div>
            <h3 className="font-atlas text-xl text-ice mb-1.5">What a microclimate is</h3>
            <p className="text-sm text-frost leading-relaxed">
              A microclimate is a place where the weather differs from the region around it because of the land. Mountains block rain and leave a dry side. Water keeps nearby land cooler in summer and milder in winter. Height cools the air. A slope that faces the sun is warmer than one that faces away. Two towns an hour apart can have different summers, winters and rainfall for these reasons.
            </p>
            <p className="text-sm text-frost leading-relaxed mt-2">
              This atlas describes {PLACE_COUNT} such places in the United States, Canada and Mexico. Each profile gives the monthly averages, explains what causes the local climate, and says what it is like to visit or live there.
            </p>
          </div>
        </div>
      </div>

      <div className="panel p-4 border-[rgba(26,143,168,0.22)]">
        <div className="text-xs uppercase tracking-wider text-stone mb-1">Start here</div>
        <h3 className="font-atlas text-lg text-ice mb-2">How to use the atlas</h3>
        <ol className="text-sm text-frost leading-relaxed list-decimal pl-5 space-y-1.5">
          <li>Go to <span className="text-ice font-medium">Atlas</span> and open any place from the map or the card list.</li>
          <li>Read the profile from the top, or use <span className="text-ice font-medium">On this page</span> to jump to a section.</li>
          <li>Use <span className="text-ice font-medium">Search</span> and <span className="text-ice font-medium">Rank by</span> in the <span className="text-ice font-medium">Filters</span> panel (the side panel on desktop, the Filters button on a phone) to reorder or narrow the list. The map shows the same filtered set.</li>
          <li>Save places, then open <span className="text-ice font-medium">Compare</span> to see up to four side by side.</li>
          <li>Come back here for the terms (rain shadow, chinook and others). Each one links to example places; select one to open its profile.</li>
        </ol>
      </div>

      <div className="panel p-4 border-[rgba(232,155,32,0.2)]">
        <div className="text-xs uppercase tracking-wider text-stone mb-1">How places are grouped</div>
        <h3 className="font-atlas text-lg text-ice mb-2">Five kinds of cause</h3>
        <p className="text-sm text-frost leading-relaxed mb-3">
          Each place is tagged with the causes that make its weather differ from the regional average. The same five groups apply everywhere, from a rain-shadow desert to a fog belt or a tropical highland.
        </p>
        <dl className="space-y-2.5 text-sm">
          <div className="border-l-2 border-[rgba(232,155,32,0.45)] pl-3">
            <dt className="font-semibold text-ice">Topography &amp; elevation</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Sky islands, thermal belts, rain shadows, warm downslope winds, the direction a slope faces, cold air pooling in valleys, and winds through gaps: terrain changes temperature, moisture and wind.
            </dd>
          </div>
          <div className="border-l-2 border-[rgba(26,143,168,0.4)] pl-3">
            <dt className="font-semibold text-ice">Water</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Oceans and cold currents, lakes (which steady temperature and feed lake-effect snow), rivers and wetlands: water stores heat and moisture differently from land.
            </dd>
          </div>
          <div className="border-l-2 border-[rgba(61,143,85,0.4)] pl-3">
            <dt className="font-semibold text-ice">Vegetation &amp; soil</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Forest canopy, soil drainage and limestone ground: what covers the surface and what lies under it change humidity, frost and how water moves.
            </dd>
          </div>
          <div className="border-l-2 border-[rgba(224,77,122,0.35)] pl-3">
            <dt className="font-semibold text-ice">Urban &amp; built form</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Paving and rooftops hold heat, streets channel wind and drains change where water goes: cities add their own microclimates to the natural ones.
            </dd>
          </div>
          <div className="border-l-2 border-[rgba(90,79,71,0.35)] pl-3">
            <dt className="font-semibold text-ice">Underground &amp; shelter</dt>
            <dd className="text-frost leading-relaxed mt-0.5">
              Caves, deep ravines and frost hollows: sheltered pockets where still air keeps its own temperature, apart from the open air above.
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {CONCEPTS.map(c => (
          <div
            key={c.id}
            className="panel p-4 learn-concept-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-3.5 h-3.5" style={{ color: "#8cc8e0" }} aria-hidden />
              <h4 className="font-atlas text-lg text-ice">{c.term}</h4>
            </div>
            <div className="text-sm text-frost italic mb-1.5">{prose(c.short)}</div>
            <p className="text-sm text-frost leading-relaxed">{prose(c.long)}</p>
            {c.mechanism && (
              <div className="panel-thin p-2.5 mt-2 border-l-2" style={{ borderLeftColor: "#f0d29c" }}>
                <div className="text-[10px] uppercase tracking-wider text-stone">How it works</div>
                <div className="text-xs text-ice mt-0.5">{prose(c.mechanism)}</div>
              </div>
            )}
            {c.exampleIds && c.exampleIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 items-center">
                <div className="text-[10px] uppercase tracking-wider text-stone mr-1">See it here:</div>
                {c.exampleIds.map(id => {
                  const p = PLACES_BY_ID[id];
                  if (!p) return null;
                  const openProfileLabel = `Open ${p.name} profile from Learn concept: ${c.term}`;
                  return (
                    <button
                      key={id}
                      onClick={event => onOpenPlace(id, { trigger: event.currentTarget })}
                      className="chip chip-btn"
                      data-tone="glacier"
                      aria-label={openProfileLabel}
                      title={openProfileLabel}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel p-4 border-[rgba(26,143,168,0.22)]">
        <div className="text-xs uppercase tracking-wider text-stone mb-1">Sources</div>
        <h3 className="font-atlas text-lg text-ice mb-2">Where the numbers come from</h3>
        <ul className="text-sm text-frost leading-relaxed list-disc pl-5 space-y-1.5">
          <li>
            Temperature and precipitation are 30-year averages for <span className="text-ice font-medium">1996–2025</span>, taken from Daymet, a NASA-supported dataset that estimates daily weather on a 1 km grid from station records. This is a recent average, not the official 1991–2020 climate normal; profiles show the 1991–2020 figures alongside for comparison.
          </li>
          <li>
            Weather-station records from NOAA (United States), Environment and Climate Change Canada and Mexico&apos;s Servicio Meteorológico Nacional are used to check the grid. ERA5-Land, a European reanalysis, fills gaps and is used for cross-checks only.
          </li>
          <li>
            Sunshine is shown as solar energy reaching the ground (kWh per square metre per day), calculated from the grid. It is not a count of observed sunshine hours.
          </li>
          <li>
            Snow figures from the grid are the water held in the snowpack, not inches of snowfall.
          </li>
          <li>
            Mid-century (2050) outlooks are a broad regional estimate by latitude band, taken from the IPCC AR6 regional summaries and applied to the 1996–2025 averages. They are guides, not local forecasts or engineering figures.
          </li>
          <li>
            Scores are editorial ratings or calculations from these averages. Each profile lists its own sources under <span className="text-ice font-medium">Scores and sources</span>.
          </li>
        </ul>
      </div>
    </div>
  );
}
