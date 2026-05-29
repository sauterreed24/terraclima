import { useMemo, type ReactNode } from "react";
import { Calendar, Compass, Home, Leaf, MapPin, Route, ShieldAlert, Sprout, TrendingUp } from "lucide-react";
import type { Place } from "../../types";
import { getClimateTourismProfile } from "../../lib/climate-tourism";
import { useProse } from "../../lib/units";

export function PlaceTourismRead({ place, anchorId, intro }: { place: Place; anchorId: string; intro?: string }) {
  const prose = useProse();
  const profile = useMemo(() => getClimateTourismProfile(place), [place]);

  return (
    <section id={anchorId} className="detail-doc-section anim-fade-in scroll-mt-28">
      <h3 className="font-atlas text-[1.15rem] md:text-lg text-ice mb-3.5 flex items-center gap-2 tracking-tight border-b border-[rgba(200,170,140,0.35)] pb-2">
        <Route className="w-4 h-4 shrink-0" style={{ color: "#f0d29c" }} aria-hidden />
        Climate tourism
      </h3>
      <p className="text-[12px] text-stone-readable leading-relaxed mb-3.5 max-w-2xl">
        {prose(intro ?? "Want to test this place in person? Use this as a scouting itinerary, not a booking engine.")}
      </p>

      <div className="grid md:grid-cols-3 gap-2 mb-4">
        <TourismScore label="Tourism appeal" value={profile.scores.tourismAppeal} note={profile.scoreNotes.tourismAppeal} />
        <TourismScore label="Would I live here?" value={profile.scores.wouldLiveHere} note={profile.scoreNotes.wouldLiveHere} />
        <TourismScore label="Investment lens: climate/land signal" value={profile.scores.climateLandOptionality} note={profile.scoreNotes.climateLandOptionality} />
      </div>

      <div className="panel-field-story p-4 md:p-5 rounded-2xl border border-[rgba(199,181,234,0.22)] mb-4">
        <div className="text-[10px] uppercase tracking-wider text-stone mb-2">Climate story</div>
        <p className="text-[color:var(--color-frost-strong)] leading-[1.7] text-sm">{prose(profile.climateStory)}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <TourismPanel icon={<Calendar className="w-4 h-4" aria-hidden />} title="Best visit window">
          <div className="font-atlas text-base text-ice">{profile.bestVisitWindow.label}: {profile.bestVisitWindow.range}</div>
          <p className="text-sm text-frost leading-relaxed mt-1">{prose(profile.bestVisitWindow.reason)}</p>
        </TourismPanel>

        <TourismPanel icon={<Sprout className="w-4 h-4" aria-hidden />} title={profile.growThere.headline}>
          <List items={[
            `Best fits: ${profile.growThere.bestFits.join(", ")}`,
            `Tricky: ${profile.growThere.tricky.join(", ")}`,
          ]} />
        </TourismPanel>

        <TourismPanel icon={<Compass className="w-4 h-4" aria-hidden />} title={profile.wildlifeAndHabitat.headline}>
          <List items={profile.wildlifeAndHabitat.cues} />
          <p className="text-[11px] text-stone italic mt-2">{prose(profile.wildlifeAndHabitat.caveat)}</p>
        </TourismPanel>

        <TourismPanel icon={<Leaf className="w-4 h-4" aria-hidden />} title={profile.soilRead.headline}>
          <List items={profile.soilRead.bullets} />
        </TourismPanel>

        <TourismPanel icon={<ShieldAlert className="w-4 h-4" aria-hidden />} title={profile.riskRead.headline}>
          <List items={profile.riskRead.topRisks} />
          <p className="text-[11px] text-stone italic mt-2">{prose(profile.riskRead.caveat)}</p>
        </TourismPanel>

        <TourismPanel icon={<Home className="w-4 h-4" aria-hidden />} title="Nearby lodging search cues">
          <List items={[`Base: ${profile.lodgingRead.base}`, ...profile.lodgingRead.searchCues]} />
          <p className="text-[11px] text-stone italic mt-2">{prose(profile.lodgingRead.caveat)}</p>
        </TourismPanel>
      </div>

      <div className="panel-thin p-4 mt-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone mb-2">
          <MapPin className="w-3.5 h-3.5" aria-hidden />
          Scouting itinerary
        </div>
        <h4 className="font-atlas text-lg text-ice">{profile.itinerary.title}</h4>
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          {profile.itinerary.days.map(day => (
            <article key={day.day} className="panel-thin p-3">
              <div className="text-[10px] uppercase tracking-wider text-stone mb-1">Day {day.day}</div>
              <h5 className="font-atlas text-sm text-ice">{day.title}</h5>
              <List items={[
                `Morning: ${day.morning}`,
                `Afternoon: ${day.afternoon}`,
                `Evening: ${day.evening}`,
                `Climate lens: ${day.climateLens}`,
              ]} />
            </article>
          ))}
        </div>
      </div>

      <div className="panel-warm p-3 mt-3 text-[12px] text-stone-readable leading-relaxed">
        Travel and lodging cues are static and carry no paid placement. The climate/land score is a screening signal, not financial advice, not a real estate valuation, not a parcel-level recommendation, and not a recommendation to buy. Hazard reads are atlas-grade screens; local official maps and sources matter.
      </div>
    </section>
  );
}

function TourismScore({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="panel-thin p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide text-stone leading-tight">{label}</div>
        <TrendingUp className="w-3.5 h-3.5 text-glacier-700 shrink-0" aria-hidden />
      </div>
      <div className="font-mono-num text-2xl text-ice mt-1">{value}<span className="text-sm text-stone">/100</span></div>
      <p className="text-[11px] text-stone-readable leading-snug mt-1">{note}</p>
    </div>
  );
}

function TourismPanel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <article className="panel-thin p-4 border-l-2 border-[rgba(240,210,156,0.65)]">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone mb-2">
        <span className="text-ochre-500">{icon}</span>
        Climate trip read
      </div>
      <h4 className="font-atlas text-base text-ice tracking-tight">{title}</h4>
      <div className="mt-2">{children}</div>
    </article>
  );
}

function List({ items }: { items: string[] }) {
  const prose = useProse();
  return (
    <ul className="space-y-1.5 text-[12px] text-stone-readable leading-snug">
      {items.map(item => (
        <li key={item} className="flex gap-2">
          <span aria-hidden="true" className="mt-[0.45em] h-1.5 w-1.5 rounded-full shrink-0 bg-[rgba(240,210,156,0.85)]" />
          <span>{prose(item)}</span>
        </li>
      ))}
    </ul>
  );
}
