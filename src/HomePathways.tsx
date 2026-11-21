import { Anchor, ArrowUpRight, Store } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

const pathways = [
  {
    theme: "public",
    title: "Public",
    description: "Browse fresh seafood, compare market prices and find sellers near you.",
    features: ["Seafood market", "Compare prices", "Nearby sellers"],
    to: "/explore",
    action: "Start exploring",
    icon: Store,
    // ATEEQ- PHOTOS: https://www.pexels.com/photo/33557497/
    image: "pathway-fresh-catch",
  },
  {
    theme: "fishermen",
    title: "For fishermen",
    description: "List your catch, manage orders and check the marine forecast before you head out.",
    features: ["My catches", "Orders & earnings", "Marine weather"],
    to: "/portal",
    action: "Open your portal",
    icon: Anchor,
    // Sohan Rahat: https://www.pexels.com/photo/27000784/
    image: "pathway-fishing-nets",
  },
];

export default function HomePathways({
  Link,
}: {
  Link: ComponentType<{ to: string; className?: string; children: ReactNode }>;
}) {
  return (
    <section className="home-pathways" aria-labelledby="home-pathways-heading">
      <h2 className="pathways-heading" id="home-pathways-heading">
        Find your place by the water.
      </h2>
      <div className="pathways-grid">
        {pathways.map(({ theme, title, description, features, to, action, icon: Icon, image }) => (
          <article className={`pathway-card pathway-card--${theme}`} key={theme}>
            <div className="pathway-visual" aria-hidden="true">
              <img
                src={`/images/${image}.webp`}
                srcSet={`/images/${image}-720.webp 720w, /images/${image}.webp 1200w`}
                sizes="(max-width: 560px) 100vw, (max-width: 820px) 64vw, 32vw"
                width={1200}
                height={800}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="pathway-copy">
              <span className="pathway-icon"><Icon size={24} strokeWidth={1.8} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
              <ul className="pathway-features" aria-label={`${title} features`}>
                {features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </div>
            <Link to={to} className="pathway-action">
              {action}
              <ArrowUpRight size={23} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
