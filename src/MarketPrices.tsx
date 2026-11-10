import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Minus,
  ExternalLink,
} from "lucide-react";
type Row = { id: string; data: Record<string, any> };
const money = (v: number) =>
  new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 }).format(v / 100);
export function PriceChange({
  value,
  previous,
}: {
  value: number | null;
  previous?: number | null;
}) {
  if (value == null)
    return <span className="price-change neutral">Not reported</span>;
  if (previous == null)
    return <span className="price-change neutral">New report</span>;
  const change = value - previous,
    percent = previous ? Math.abs((change / previous) * 100).toFixed(1) : null;
  return (
    <span
      className={
        "price-change " + (change < 0 ? "down" : change > 0 ? "up" : "neutral")
      }
    >
      {change < 0 ? (
        <ArrowDownRight size={15} />
      ) : change > 0 ? (
        <ArrowUpRight size={15} />
      ) : (
        <Minus size={14} />
      )}{" "}
      {change === 0
        ? "No change"
        : `${change > 0 ? "+" : "−"}${money(Math.abs(change))}${percent ? " (" + percent + "%)" : ""}`}
    </span>
  );
}
export default function MarketPrices({
  rows,
  compact = false,
  onNavigate,
}: {
  rows: Row[];
  compact?: boolean;
  onNavigate: (path: string) => void;
}) {
  const [basis, setBasis] = useState<"retail" | "wholesale">("retail"),
    [query, setQuery] = useState(""),
    [market, setMarket] = useState("All markets");
  const latest = [...new Set(rows.map((x) => x.data.date))].sort().reverse()[0];
  const chosen = rows.filter((r) => r.data.date === latest),
    markets = [...new Set(chosen.map((r) => r.data.market))];
  const previewNames = ["Kelawalla", "Hurulla", "Salaya", "Linna"];
  const preview = previewNames
    .map(
      (name) =>
        chosen.find(
          (r) =>
            r.data.name === name &&
            r.data.market ===
              (name === "Kelawalla" ? "Negombo" : "Narahenpita"),
        ) || chosen.find((r) => r.data.name === name),
    )
    .filter(Boolean) as Row[];
  const list = chosen.filter(
    (r) =>
      (market === "All markets" || r.data.market === market) &&
      (r.data.name + " " + r.data.market)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className={"market-section " + (compact ? "compact" : "")}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">A CLEARER VIEW OF THE MARKET</p>
          <h2>
            {compact
              ? "Know the price. Buy with confidence."
              : "Market price comparison"}
          </h2>
          <p className="market-subtitle">
            CBSL reference report ·{" "}
            {latest
              ? new Date(latest + "T00:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "No report published"}{" "}
            · LKR / kg
          </p>
        </div>
        {compact ? (
          <a
            href="/prices"
            className="text-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("/prices");
            }}
          >
            See more prices <ArrowUpRight size={18} />
          </a>
        ) : (
          <a
            href="https://www.cbsl.gov.lk/en/statistics/economic-indicators/price-report"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            CBSL reports <ExternalLink size={15} />
          </a>
        )}
      </div>
      {compact ? (
        <div className="price-preview-grid">
          {preview.map((r) => (
            <article className="price-tile" key={r.id}>
              <div className="price-tile-heading">
                <span>{r.data.name}</span>
                <span className="tiny-dot" />
              </div>
              <p>{r.data.market} · Retail</p>
              <strong>
                <small>LKR</small>{" "}
                {r.data.retail == null ? "—" : money(r.data.retail)}
                <small> / kg</small>
              </strong>
              <PriceChange
                value={r.data.retail}
                previous={r.data.previousRetail}
              />
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="price-tools">
            <div className="price-switch">
              <button
                className={basis === "retail" ? "active" : ""}
                onClick={() => setBasis("retail")}
              >
                Retail prices
              </button>
              <button
                className={basis === "wholesale" ? "active" : ""}
                onClick={() => setBasis("wholesale")}
              >
                Wholesale prices
              </button>
            </div>
            <input
              aria-label="Search species"
              placeholder="Search fish species…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Choose price market"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
            >
              <option>All markets</option>
              {markets.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="table-wrap">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Fish species</th>
                  <th>Market</th>
                  <th>Previous report</th>
                  <th>Reported price</th>
                  <th>Movement</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const value = r.data[basis],
                    previous =
                      r.data[
                        basis === "retail"
                          ? "previousRetail"
                          : "previousWholesale"
                      ];
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.data.name}</strong>
                      </td>
                      <td>{r.data.market}</td>
                      <td>
                        {previous == null
                          ? "Not reported"
                          : "LKR " + money(previous)}
                      </td>
                      <td>
                        {value == null ? (
                          "Not reported"
                        ) : (
                          <strong>
                            LKR {money(value)} <small>/ kg</small>
                          </strong>
                        )}
                      </td>
                      <td>
                        <PriceChange value={value} previous={previous} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!list.length && (
              <p className="empty">
                No matching prices. Try a different species or market.
              </p>
            )}
          </div>
        </>
      )}
      <div className="market-footnote">
        <p>
          <span className="legend-dot green" />
          Price decreased <span className="legend-dot red" />
          Price increased <span className="legend-dot grey" />
          Unchanged or unavailable
        </p>
        {chosen.some((r) => r.data.report) && (
          <a
            className="text-link"
            href="/reports/cbsl-price-report-2026-10-15.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Read 15 Oct report <ArrowRight size={14} />
          </a>
        )}
      </div>
      <p className="small muted">
        Dated market references, not live seller quotations or Sainthamaruthu
        prices. Availability, preparation and delivery can change your final
        total.
        {latest && Date.now() - Date.parse(latest) > 2 * 86400000
          ? " A newer report may be available from CBSL."
          : ""}
      </p>
    </section>
  );
}
