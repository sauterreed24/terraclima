import { useMemo } from "react";
import type { ReactNode } from "react";
import { Compass, Home, Leaf, Satellite } from "lucide-react";
import type { Place } from "../../types";
import { buildPracticalReadCards, type PracticalReadCard, type PracticalReadId } from "../../lib/practical-read";
import { useProse } from "../../lib/units";

const ICON_BY_ID: Record<PracticalReadId, ReactNode> = {
  agriculture: <Leaf className="w-4 h-4" aria-hidden />,
  spatial: <Satellite className="w-4 h-4" aria-hidden />,
  housing: <Home className="w-4 h-4" aria-hidden />,
  nearby: <Compass className="w-4 h-4" aria-hidden />,
};

function cardAccent(card: PracticalReadCard): string {
  switch (card.tone) {
    case "sage": return "#c6dcbd";
    case "ice": return "#8cc8e0";
    case "ember": return "#d37c5b";
    case "aurora": return "#c7b5ea";
  }
}

export function PlacePracticalRead({ place, anchorId }: { place: Place; anchorId: string }) {
  const prose = useProse();
  const cards = useMemo(() => buildPracticalReadCards(place), [place]);

  return (
    <section id={anchorId} className="detail-doc-section anim-fade-in scroll-mt-28">
      <h3 className="font-atlas text-[1.15rem] md:text-lg text-ice mb-3.5 flex items-center gap-2 tracking-tight border-b border-[rgba(200,170,140,0.35)] pb-2">
        <Compass className="w-4 h-4 shrink-0" style={{ color: "#c7b5ea" }} aria-hidden />
        Practical read
      </h3>
      <p className="text-[12px] text-stone-readable leading-relaxed mb-3.5 max-w-2xl">
        The quick human pass before the long dossier: agriculture, spatial evidence, homes and land, and nearby ways to test the microclimate in person.
      </p>
      <div className="grid md:grid-cols-2 gap-3">
        {cards.map(card => (
          <article
            key={card.id}
            className="panel-thin p-4 border-l-2"
            style={{ borderLeftColor: cardAccent(card) }}
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-stone mb-2">
              <span className="inline-flex" style={{ color: cardAccent(card) }}>
                {ICON_BY_ID[card.id]}
              </span>
              {card.eyebrow}
            </div>
            <h4 className="font-atlas text-base text-ice tracking-tight">{card.title}</h4>
            <p className="text-sm text-frost leading-relaxed mt-1.5">{prose(card.body)}</p>
            <ul className="mt-3 space-y-1.5 text-[12px] text-stone-readable leading-snug">
              {card.bullets.map(bullet => (
                <li key={bullet} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[0.45em] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: cardAccent(card) }} />
                  <span>{prose(bullet)}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
