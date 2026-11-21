import { ArrowDown, ArrowRight, ArrowUpRight, CloudSun, Fish, MapPin, Store, Waves } from "lucide-react";
import type { ReactNode } from "react";
import { SiteLink } from "./SiteLink";

const destinations = [
  {
    to: "/market",
    title: "Seafood market",
    description: "Browse the catch",
    image: "/images/bluenet-market.webp",
    icon: Fish,
  },
  {
    to: "/prices",
    title: "Market prices",
    description: "Compare CBSL price reports",
    image: "/images/bluenet-prices.webp",
    icon: Store,
  },
  {
    to: "/weather",
    title: "Marine weather",
    description: "Check forecasts and advisories",
    image: "/images/bluenet-ocean.webp",
    icon: CloudSun,
  },
];

export default function Landing({
  translate: t,
  signedIn,
  prices,
  stories,
  help,
}: {
  translate: (label: string) => string;
  signedIn: boolean;
  prices: ReactNode;
  stories: ReactNode;
  help: ReactNode;
}) {
  return (
    <>
      <section className="landing-hero" aria-labelledby="landing-title">
        <img
          className="landing-ocean"
          src="/images/bluenet-ocean.webp"
          alt=""
          fetchPriority="high"
        />
        <div className="landing-hero-copy">
          <p className="landing-location"><MapPin size={15} /> Sri Lanka’s seafood community</p>
          <h1 id="landing-title">{t("Fresh seafood.")}<br />{t("A closer connection.")}</h1>
          <p className="landing-lead">{t("Discover the daily catch from local fishermen.")}</p>
          <div className="landing-actions">
            <SiteLink to="/market" className="button landing-primary">
              {t("Shop seafood")} <ArrowUpRight size={18} />
            </SiteLink>
            <SiteLink to="/portal" className="button landing-secondary">
              {t("Fisherman portal")} <ArrowRight size={17} />
            </SiteLink>
          </div>
        </div>
        <a className="landing-scroll" href="#discover" aria-label="Scroll to explore Bluenet">
          <ArrowDown size={21} />
        </a>
      </section>

      <section id="discover" className="landing-section landing-discover" aria-labelledby="discover-title">
        <div className="landing-heading">
          <h2 id="discover-title">Explore the coast</h2>
          <SiteLink to="/explore" className="text-link">See all destinations <ArrowUpRight size={17} /></SiteLink>
        </div>
        <div className="landing-destinations">
          {destinations.map(({ to, title, description, image, icon: Icon }) => (
            <SiteLink key={to} to={to} className="landing-destination">
              <img src={image} alt="" loading="lazy" />
              <span className="destination-icon"><Icon size={18} /></span>
              <div className="destination-copy">
                <div><h3>{t(title)}</h3><p>{description}</p></div>
                <ArrowUpRight size={21} />
              </div>
            </SiteLink>
          ))}
        </div>
      </section>

      <section className="landing-workspace" aria-labelledby="fishermen-title">
        <div className="landing-workspace-copy">
          <span className="workspace-symbol"><Waves size={27} /></span>
          <h2 id="fishermen-title">A workspace for fishermen.</h2>
          <p>List your catch, manage orders and check marine conditions before heading out.</p>
          <SiteLink to="/portal" className="button landing-primary">
            {signedIn ? "Open your portal" : "Go to the fishermen’s portal"} <ArrowUpRight size={17} />
          </SiteLink>
        </div>
        <img src="/images/bluenet-coast.webp" alt="Fishermen tending nets next to a boat" loading="lazy" />
      </section>

      {prices}
      {stories}
      {help}
    </>
  );
}
