"use client";
import { useState, useEffect, ReactNode, FormEvent } from "react";
import {
  Waves,
  ShoppingBag,
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  MapPin,
  Search,
  Plus,
  Minus,
  X,
  Menu,
  Check,
  ShieldCheck,
  CloudSun,
  Wind,
  Anchor,
  LifeBuoy,
  Phone,
  Share2,
  Navigation,
  Package,
  LayoutDashboard,
  Fish,
  Wallet,
  User,
  Settings,
  Star,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Clock,
  Store,
  FileText,
  Loader2,
  Users,
} from "lucide-react";
import {
  districts,
  categories,
  samples,
  subtotal,
  nextStates,
} from "../lib/domain";
import { i18n } from "../lib/i18n";
import AuthForm from "./AuthForm";
import MarketPrices from "./MarketPrices";
// Also support local HTTP previews, where randomUUID is unavailable.
function requestId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
type R = Record<string, any>;
type Cart = { id: string; grams: number; preparation: string }[];
const money = (n: number) =>
    "LKR " +
    new Intl.NumberFormat("en-LK", { maximumFractionDigits: 2 }).format(
      (n || 0) / 100,
    ),
  date = (s: string) =>
    s
      ? new Date(s).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—",
  v = (f: FormData, k: string) => String(f.get(k) || "");
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Fish size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export default function App() {
  const [data, setData] = useState<R>({
      me: null,
      listings: [],
      sellers: [],
      records: [],
      reviews: [],
    }),
    [work, setWork] = useState<R>({
      listings: [],
      orders: [],
      expenses: [],
      reviews: [],
    }),
    [admin, setAdmin] = useState<R>({
      profiles: [],
      listings: [],
      orders: [],
      records: [],
      audit: [],
    });
  const [path, setPath] = useState("/"),
    [lang, setLang] = useState("en"),
    [cart, setCart] = useState<Cart>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState<R | null>(null),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("All seafood"),
    [location, setLocation] = useState("All locations"),
    [sort, setSort] = useState("Fresh arrivals"),
    [maxPrice, setMaxPrice] = useState(""),
    [qty, setQty] = useState(1),
    [prep, setPrep] = useState("Whole"),
    [method, setMethod] = useState("pickup"),
    [requestKey, setRequestKey] = useState(""),
    [tab, setTab] = useState("Overview"),
    [image, setImage] = useState("/images/tuna.png"),
    [weather, setWeather] = useState<R | null>(null),
    [city, setCity] = useState("Negombo"),
    [gps, setGps] = useState<R | null>(null),
    [online, setOnline] = useState(true),
    [period, setPeriod] = useState("All time"),
    [statusFilter, setStatusFilter] = useState("All");
  const t = (s: string) => i18n[lang]?.[s] || s,
    me = data.me,
    isPortal = path.startsWith("/portal"),
    isAdmin = path === "/admin" || path.startsWith("/admin/");
  async function read(kind = "bootstrap") {
    const r = await fetch("/api/app?kind=" + kind),
      d: R = await r.json();
    if (!r.ok) throw Error(d.error);
    if (kind === "bootstrap") {
      setData(d);
      setError("");
    } else if (kind === "workspace") setWork(d);
    else if (kind === "admin") setAdmin(d);
    return d;
  }
  useEffect(() => {
    setPath(window.location.pathname);
    setLang(localStorage.getItem("fc-lang") || "en");
    setOnline(navigator.onLine);
    setRequestKey(requestId());
    read()
      .then(async (d) => {
        let guest: Cart = [];
        try {
          guest = JSON.parse(localStorage.getItem("fc-cart") || "[]");
        } catch {}
        if (d.me) {
          if (!d.cart.length && guest.length) {
            const r = await fetch("/api/app", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "cart", items: guest }),
            });
            if (r.ok) {
              setCart(guest);
              localStorage.removeItem("fc-cart");
            } else setCart(d.cart);
          } else setCart(d.cart);
        } else setCart(guest);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const pop = () => {
        setPath(window.location.pathname);
        setModal(null);
      },
      on = () => setOnline(navigator.onLine);
    window.addEventListener("popstate", pop);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (me && (isPortal || path === "/orders" || path === "/account"))
      read("workspace").catch((e) => setToast(e.message));
    if (me?.isAdmin && isAdmin) read("admin").catch((e) => setToast(e.message));
  }, [path, me?.id]);
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("fc-lang", lang);
  }, [lang]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 6500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    if (path.endsWith("/weather")) {
      setWeather(null);
      const c = new AbortController();
      fetch("/api/app?kind=weather&city=" + encodeURIComponent(city), {
        signal: c.signal,
      })
        .then((r) => r.json())
        .then((d: any) =>
          setWeather(d.error ? { available: false, message: d.error } : d),
        )
        .catch((e) => {
          if (e.name !== "AbortError")
            setWeather({
              available: false,
              message: "Forecast connection unavailable.",
            });
        });
      return () => c.abort();
    }
  }, [path, city]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    document.addEventListener("keydown", escape);
    setTimeout(
      () =>
        document
          .querySelector<HTMLElement>(".modal input,.modal button")
          ?.focus(),
      20,
    );
    return () => {
      document.removeEventListener("keydown", escape);
      previous?.focus();
    };
  }, [modal?.type]);
  function go(p: string) {
    window.history.pushState({}, "", p);
    setPath(p);
    setMenu(false);
    setModal(null);
    setQty(1);
    setPrep("Whole");
    setSearch("");
    window.scrollTo(0, 0);
  }
  async function authSuccess(p: string) {
    await read();
    go(p);
  }
  async function signout() {
    const r = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (r.ok) {
      setCart([]);
      await read();
      go("/");
    } else setToast("Unable to sign out. Please retry.");
  }
  async function authAction(endpoint: string, body: R) {
    if (busy) return null;
    setBusy(true);
    try {
      const r = await fetch("/api/auth/" + endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        d = (await r.json()) as R;
      if (!r.ok) throw Error(d.error);
      return d;
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Unable to save");
      return null;
    } finally {
      setBusy(false);
    }
  }
  function A({
    to,
    children,
    className = "",
  }: {
    to: string;
    children: ReactNode;
    className?: string;
  }) {
    return (
      <a
        href={to}
        className={className}
        onClick={(e) => {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            go(to);
          }
        }}
      >
        {children}
      </a>
    );
  }
  async function act(b: R, message = "Saved successfully") {
    if (busy) return null;
    if (!online) {
      setToast("You are offline. Reconnect before saving.");
      return null;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(b),
        }),
        d: R = await r.json();
      if (!r.ok) throw Error(d.error);
      if (message) setToast(message);
      await read();
      if (me) await read("workspace");
      if (isAdmin && me?.isAdmin) await read("admin");
      return d;
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Unable to save");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function saveCart(next: Cart) {
    if (me) {
      if (!(await act({ action: "cart", items: next }, ""))) return false;
    } else localStorage.setItem("fc-cart", JSON.stringify(next));
    setCart(next);
    return true;
  }
  const catalogue = data.listings.length ? data.listings : samples,
    products = [...data.listings, ...samples],
    product = products.find((p: R) => path === "/seafood/" + p.id),
    entries = (type: string) => data.records.filter((r: R) => r.type === type),
    cartLines = cart.map((c) => ({
      ...c,
      p: data.listings.find((p: R) => p.id === c.id),
    })),
    cartSeller = data.sellers.find(
      (s: R) => s.id === cartLines[0]?.p?.seller_id,
    ),
    total = cartLines.reduce(
      (n, c) =>
        n +
        (c.p
          ? subtotal(
              c.p.price,
              c.preparation === "Whole" ? 0 : c.p.cleaning,
              c.grams,
            )
          : 0),
      0,
    );
  const title = (
    name: string,
    description = "",
    action?: ReactNode,
    eyebrow = "",
  ) => (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{t(name)}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
  const notice = (text: string) => (
    <div className="notice">
      <AlertTriangle size={18} />
      <span>{text}</span>
    </div>
  );
  const signin = (
    <AuthForm
      returnTo={path === "/login" ? "/portal" : path}
      onSuccess={authSuccess}
    />
  );
  function card(p: R, featured = false) {
    return (
      <article
        key={p.id}
        className={featured ? "featured-product" : "product-card"}
      >
        <A to={"/seafood/" + p.id} className="product-image">
          <img src={p.image} alt={p.name} loading="lazy" />
        </A>
        <div className="product-info">
          <p className="eyebrow">{p.district}</p>
          <A to={"/seafood/" + p.id}>
            <h3>{p.name}</h3>
          </A>
          <p className="description">{p.description}</p>
          <p className="price">
            {money(p.price)} <span>/ kg</span>
          </p>
          <A to={"/seafood/" + p.id} className="text-link">
            {t("View catch")} <ArrowRight size={17} />
          </A>
        </div>
      </article>
    );
  }
  function csv(name: string, rows: any[][]) {
    const content = rows
        .map((row) =>
          row
            .map(
              (x) =>
                '"' +
                String(x ?? "")
                  .replace(/^[=+@-]/, "'$&")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(","),
        )
        .join("\n"),
      a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }),
    );
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function profile() {
    return (
      <>
        {title(
          "My profile",
          "Your fishing profile, contact details, and private emergency contacts.",
        )}
        <form
          className="panel"
          key={me.id + me.verification}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await act(
              {
                action: "profile",
                name: v(f, "name"),
                phone: v(f, "phone"),
                district: v(f, "district"),
                harbor: v(f, "harbor"),
                vessel: v(f, "vessel"),
                role: v(f, "role"),
                delivery: f.get("delivery") === "on",
                deliveryFee: Math.round(Number(f.get("deliveryFee")) * 100),
                contacts: [1, 2]
                  .map((n) => ({
                    name: v(f, "contactName" + n),
                    phone: v(f, "contactPhone" + n),
                  }))
                  .filter((x) => x.name || x.phone),
              },
              "Profile saved. Seller verification is managed by the administrator.",
            );
          }}
        >
          <div className="profile-heading">
            <span className="avatar">{me.name.slice(0, 1)}</span>
            <div>
              <h2>{me.name}</h2>
              <p>{me.email}</p>
            </div>
            <Badge tone={me.verification === "verified" ? "green" : ""}>
              {me.verification}
            </Badge>
          </div>
          <div className="form-grid">
            <Field label={t("Name")}>
              <input name="name" required defaultValue={me.name} />
            </Field>
            <Field label={t("Phone")}>
              <input name="phone" type="tel" required defaultValue={me.phone} />
            </Field>
            <Field label={t("Account type")}>
              <select name="role" defaultValue={me.role}>
                <option value="consumer">{t("Consumer")}</option>
                <option value="fisherman">{t("Fisherman")}</option>
              </select>
            </Field>
            <Field label={t("Location")}>
              <select name="district" defaultValue={me.district}>
                {districts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label={t("Harbour")}>
              <input name="harbor" defaultValue={me.harbor} />
            </Field>
            <Field label={t("Vessel details")}>
              <input name="vessel" defaultValue={me.vessel} />
            </Field>
          </div>
          <h3>Seller fulfilment</h3>
          <label className="check">
            <input
              type="checkbox"
              name="delivery"
              defaultChecked={!!me.delivery}
            />
            Offer local delivery in your selected area
          </label>
          <Field label="Flat delivery charge (LKR)">
            <input
              type="number"
              name="deliveryFee"
              min="0"
              step=".01"
              defaultValue={me.delivery_fee / 100}
            />
          </Field>
          <h3>{t("Trusted contacts")}</h3>
          <p className="small">
            Contacts remain private. Location is shared only when you explicitly
            choose to share it.
          </p>
          <div className="form-grid">
            {[1, 2].map((n) => (
              <div key={n}>
                <Field label={"Contact " + n + " · " + t("Name")}>
                  <input
                    name={"contactName" + n}
                    defaultValue={me.contacts?.[n - 1]?.name}
                  />
                </Field>
                <Field label={t("Phone")}>
                  <input
                    name={"contactPhone" + n}
                    type="tel"
                    defaultValue={me.contacts?.[n - 1]?.phone}
                  />
                </Field>
              </div>
            ))}
          </div>
          <button className="button" disabled={busy}>
            <Check size={16} />
            {t("Save changes")}
          </button>
        </form>
        {!me.isAdmin && (
          <form
            className="panel section"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form);
              if (
                await authAction("change-password", {
                  password: v(f, "currentPassword"),
                  newPassword: v(f, "newPassword"),
                })
              ) {
                form.reset();
                setToast(
                  "Password changed. Other sessions have been signed out.",
                );
              }
            }}
          >
            <h2>Account security</h2>
            <div className="form-grid">
              <Field label="Current password">
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Field label="New password">
                <input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </Field>
            </div>
            <button className="button secondary" disabled={busy}>
              Change password
            </button>
          </form>
        )}
      </>
    );
  }
  function orderView(seller = false) {
    const list = work.orders.filter(
      (o: R) =>
        (seller ? o.seller_id === me.id : o.buyer_id === me.id) &&
        (statusFilter === "All" || o.status === statusFilter),
    );
    return (
      <>
        {title(
          seller ? "Orders" : "Your orders",
          "From confirmation to collection, follow every order.",
          <select
            aria-label="Filter orders"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {[
              "All",
              "awaiting",
              "accepted",
              "preparing",
              "ready",
              "completed",
              "cancelled",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>,
        )}
        {list.length ? (
          list.map((o: R) => (
            <article className="order" key={o.id}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ORDER #{o.id.slice(0, 8)}</p>
                  <h3>{date(o.created)}</h3>
                </div>
                <Badge tone={o.status === "completed" ? "green" : "blue"}>
                  {o.status}
                </Badge>
              </div>
              {o.items.map((i: R) => (
                <div className="list-row" key={i.id}>
                  <span>
                    {i.name}
                    <small>
                      {i.grams / 1000} kg · {i.preparation}
                    </small>
                  </span>
                  <strong>{money(i.subtotal)}</strong>
                </div>
              ))}
              <div className="order-details">
                <div>
                  <p>
                    {t(o.method === "pickup" ? "Pickup" : "Delivery")} · Cash on{" "}
                    {o.method === "pickup" ? "collection" : "delivery"}
                  </p>
                  {seller && (
                    <p>
                      {o.name} · <a href={"tel:" + o.phone}>{o.phone}</a>
                      <br />
                      {o.address}
                    </p>
                  )}
                </div>
                <strong>{money(o.total)}</strong>
              </div>
              <div className="actions">
                {nextStates(o.status, !seller).map((state) => (
                  <button
                    key={state}
                    className={
                      "button " + (state === "cancelled" ? "secondary" : "")
                    }
                    disabled={busy}
                    onClick={() =>
                      state === "cancelled"
                        ? setModal({
                            type: "confirm",
                            title: "Cancel this order?",
                            text: "Reserved stock will return to the seller.",
                            body: {
                              action: "orderStatus",
                              id: o.id,
                              status: state,
                            },
                          })
                        : act(
                            { action: "orderStatus", id: o.id, status: state },
                            "Order updated",
                          )
                    }
                  >
                    {
                      (
                        {
                          accepted: "Accept order",
                          preparing: "Start preparing",
                          ready: "Mark ready",
                          completed: "Confirm completed",
                          cancelled: "Cancel order",
                        } as R
                      )[state]
                    }
                  </button>
                ))}
                {!seller &&
                  o.status === "completed" &&
                  !work.reviews.some((r: R) => r.order_id === o.id) && (
                    <button
                      className="button secondary"
                      onClick={() => setModal({ type: "review", id: o.id })}
                    >
                      {t("Write a review")}
                    </button>
                  )}
                <button
                  className="text-link muted"
                  onClick={() => setModal({ type: "complaint", id: o.id })}
                >
                  Report an issue
                </button>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="No orders yet"
            text={
              seller
                ? "New customer orders will appear here."
                : "Your next good meal starts at the market."
            }
          >
            <A className="button" to="/market">
              {t("Explore the market")} <ArrowRight size={16} />
            </A>
          </Empty>
        )}
      </>
    );
  }
  function alerts() {
    return (
      <section className="section">
        <div className="section-heading">
          <h2>{t("Official safety alerts")}</h2>
          <a
            className="text-link"
            href="https://www.meteo.gov.lk/"
            target="_blank"
            rel="noreferrer"
          >
            Official source <ExternalLink size={15} />
          </a>
        </div>
        {entries("alert").length ? (
          entries("alert").map((r: R) => {
            const a = r.data,
              expired = Date.parse(a.expires) < Date.now();
            return (
              <article className="advisory" key={r.id}>
                <Badge tone={expired ? "" : "amber"}>
                  {expired ? "Expired" : a.severity}
                </Badge>
                <h3>{a.title}</h3>
                <p>
                  {a.area} · {a.details}
                </p>
                <p className="small">
                  {a.authority} · Issued {date(a.issued)} · Expires{" "}
                  {date(a.expires)}
                </p>
                <a
                  href={a.source}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  Read original notice <ExternalLink size={15} />
                </a>
              </article>
            );
          })
        ) : (
          <Empty
            title="No official advisories loaded"
            text="This is not an all-clear. Check the issuing authority before going to sea."
          />
        )}
      </section>
    );
  }
  function weatherView() {
    return (
      <>
        {title(
          "Marine weather",
          "Marine conditions and official coastal advisories.",
          <select
            aria-label="Coastal area"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>,
          "KNOW YOUR WATERS",
        )}
        <div className="feature-panel">
          <div>
            <p className="eyebrow">{city} · SRI LANKA</p>
            <h2>Before you head out.</h2>
            <p>
              Review conditions, check official advisories, and plan your trip
              with care.
            </p>
            <A to="/sos" className="text-link">
              {t("Emergency assistance")} <ArrowRight size={16} />
            </A>
          </div>
          <img
            src="/images/ocean-hero.png"
            alt="Fishing boat on coastal waters"
          />
        </div>
        {!weather ? (
          <div className="loading">
            <Loader2 className="spin" />
            Loading forecast…
          </div>
        ) : weather.available ? (
          <>
            <div className="metrics">
              {[
                [
                  CloudSun,
                  "Temperature",
                  weather.weather?.current?.temperature_2m,
                  "°C",
                ],
                [
                  Wind,
                  "Wind speed",
                  weather.weather?.current?.wind_speed_10m,
                  "km/h",
                ],
                [
                  Waves,
                  "Wave height",
                  weather.marine?.current?.wave_height,
                  "m",
                ],
                [
                  Clock,
                  "Wave period",
                  weather.marine?.current?.wave_period,
                  "s",
                ],
              ].map(([Icon, label, value, unit]: any) => (
                <div key={label}>
                  <Icon size={23} />
                  <span>{label}</span>
                  <strong>
                    {value ?? "Unavailable"}{" "}
                    <small>{value != null ? unit : ""}</small>
                  </strong>
                </div>
              ))}
            </div>
            <p className="small">
              Forecast: {weather.marine?.current?.time} (Sri Lanka) · Retrieved{" "}
              {new Date(weather.retrieved).toLocaleString()} ·{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open-Meteo / DWD
              </a>
            </p>
            {notice(
              "Modelled marine forecasts are not navigation guidance and do not guarantee safe conditions.",
            )}
          </>
        ) : (
          <Empty title="Forecast unavailable" text={weather.message}>
            <a
              className="button secondary"
              href="https://www.meteo.gov.lk/"
              target="_blank"
              rel="noreferrer"
            >
              Check official forecasts <ExternalLink size={16} />
            </a>
          </Empty>
        )}
        {alerts()}
      </>
    );
  }
  function pricesView() {
    return <MarketPrices rows={entries("price")} onNavigate={go} />;
  }
  function directory(type: string) {
    const station = type === "station",
      list = entries(type).filter(
        (r: R) =>
          (location === "All locations" || r.data.district === location) &&
          JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase()),
      );
    return (
      <>
        {title(
          station ? "Fishing stations" : "Equipment & services",
          station
            ? "Harbours, landing sites, and fisheries support near you."
            : "Find suppliers and service providers that keep your work moving.",
        )}
        <div className="toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Search the directory"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search directory"
            />
          </div>
          <select
            aria-label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option>All locations</option>
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        {list.length ? (
          <div className="directory-grid">
            {list.map((r: R) => (
              <article className="directory-entry" key={r.id}>
                {station ? <Anchor size={27} /> : <Settings size={27} />}
                <p className="eyebrow">
                  {r.data.district} {r.data.category && "· " + r.data.category}
                </p>
                <h2>{r.data.name}</h2>
                <p>{r.data.address || r.data.details}</p>
                <p>{r.data.services}</p>
                <div className="actions">
                  {r.data.phone && (
                    <a href={"tel:" + r.data.phone} className="text-link">
                      <Phone size={16} />
                      {r.data.phone}
                    </a>
                  )}
                  {station && (
                    <a
                      href={
                        "https://www.google.com/maps/search/?api=1&query=" +
                        encodeURIComponent(
                          r.data.name + " " + r.data.address + " Sri Lanka",
                        )
                      }
                      className="text-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Directions <ArrowUpRight size={16} />
                    </a>
                  )}
                </div>
                <a
                  className="small muted"
                  href={r.data.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source · reviewed {date(r.created)}
                </a>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Reviewed directory entries coming soon"
            text="Only reviewed contact details are published. Try another location or check back after entries are added."
          />
        )}
      </>
    );
  }
  function sos() {
    return (
      <>
        {title(
          "Emergency assistance",
          "Call for help and share your location with someone you trust.",
        )}
        <div className="emergency-grid">
          <section className="emergency-call">
            <LifeBuoy size={40} />
            <h2>Need urgent assistance?</h2>
            <p>Sri Lanka Disaster Management Centre</p>
            <a className="button danger" href="tel:117">
              <Phone size={20} />
              Call DMC 117
            </a>
            <a
              className="small"
              href="https://www.dmc.gov.lk/index.php?Itemid=226&id=61&lang=en&option=com_content&view=article"
              target="_blank"
              rel="noreferrer"
            >
              Official DMC contact source
            </a>
            <p className="small">
              The call uses your phone connection. This app does not dispatch
              rescue teams or notify authorities automatically.
            </p>
          </section>
          <section className="panel">
            <h2>Your current location</h2>
            <p>
              Coordinates remain on your device unless you choose to share them.
            </p>
            <div className="location-readout">
              <Navigation size={23} />
              {gps ? (
                <span>
                  <strong>
                    {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                  </strong>
                  <small>
                    Accuracy ±{Math.round(gps.accuracy)} m ·{" "}
                    {new Date(gps.time).toLocaleTimeString()}
                  </small>
                </span>
              ) : (
                <span>Location permission required</span>
              )}
            </div>
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => {
                  if (!navigator.geolocation) {
                    setToast("Location is unavailable on this device");
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (p) =>
                      setGps({
                        latitude: p.coords.latitude,
                        longitude: p.coords.longitude,
                        accuracy: p.coords.accuracy,
                        time: Date.now(),
                      }),
                    (e) =>
                      setToast(
                        e.code === 1
                          ? "Location permission denied. Enable it in browser settings."
                          : "Unable to get your location. Please retry.",
                      ),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
                  );
                }}
              >
                <MapPin size={16} />
                {t("Get my location")}
              </button>
              <button
                className="button"
                disabled={!gps || !online}
                onClick={async () => {
                  if (!gps) return;
                  const text = `I need assistance. My location: https://maps.google.com/?q=${gps.latitude},${gps.longitude} (accuracy ±${Math.round(gps.accuracy)} m; captured ${new Date(gps.time).toISOString()})`;
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: "My location — Fisheries Connect",
                        text,
                      });
                      setToast(
                        "Sharing dialog completed. Delivery has not been confirmed.",
                      );
                    } else {
                      await navigator.clipboard.writeText(text);
                      setToast(
                        "Location copied. Paste it into a message to your selected contact.",
                      );
                    }
                  } catch {
                    setToast(
                      "Location was not shared. Try again or call your contact.",
                    );
                  }
                }}
              >
                <Share2 size={16} />
                {t("Share location")}
              </button>
            </div>
            <p className="small">
              Choose the recipient in your device’s sharing dialog. Sharing
              requires connectivity; delivery is not guaranteed.
            </p>
          </section>
        </div>
        <div className="section-heading section">
          <h2>{t("Trusted contacts")}</h2>
          <A className="text-link" to="/account">
            Manage contacts <ArrowRight size={16} />
          </A>
        </div>
        {me?.contacts?.length ? (
          me.contacts.map((c: R, i: number) => (
            <div className="list-row" key={i}>
              <span>{c.name}</span>
              <a href={"tel:" + c.phone} className="text-link">
                <Phone size={16} />
                {c.phone}
              </a>
            </div>
          ))
        ) : (
          <p className="muted">
            Save trusted contacts in your profile for quick access here.
          </p>
        )}
        {notice(
          "Offshore connectivity may be unavailable. This PWA is not a substitute for marine radio or distress equipment. Follow official emergency procedures.",
        )}
        <A to="/stations" className="text-link">
          {t("Fishing stations")} <ArrowRight size={16} />
        </A>
      </>
    );
  }
  function fisherman() {
    if (path === "/portal/catches")
      return (
        <>
          {title(
            "My catches",
            "Keep your available stock and prices up to date.",
            <button
              className="button"
              onClick={() => {
                setImage("/images/tuna.png");
                setModal({ type: "catch" });
              }}
            >
              <Plus size={16} />
              {t("Add new catch")}
            </button>,
          )}
          {work.listings.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Catch</th>
                    <th>Available</th>
                    <th>Price / kg</th>
                    <th>Status</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {work.listings.map((p: R) => (
                    <tr key={p.id}>
                      <td>
                        <span className="table-product">
                          <img src={p.image} alt="" />
                          {p.name}
                        </span>
                      </td>
                      <td>{p.stock / 1000} kg</td>
                      <td>{money(p.price)}</td>
                      <td>
                        <Badge tone={p.status === "active" ? "green" : ""}>
                          {p.status}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => {
                            setImage(p.image);
                            setModal({ type: "catch", item: p });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-link muted"
                          disabled={busy}
                          onClick={() =>
                            act(
                              { action: "hideListing", id: p.id },
                              "Listing hidden",
                            )
                          }
                        >
                          Hide
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Your first catch starts here"
              text="Add a photo, set a weight and price, and submit your catch for review."
            />
          )}
        </>
      );
    if (path === "/portal/orders") return orderView(true);
    if (path === "/portal/earnings") {
      const cutoff =
        period === "This month"
          ? new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1,
            ).toISOString()
          : period === "Last 30 days"
            ? new Date(Date.now() - 30 * 86400000).toISOString()
            : "";
      const sales = work.orders.filter(
          (o: R) =>
            o.seller_id === me.id &&
            o.status === "completed" &&
            o.created >= cutoff,
        ),
        expenses = work.expenses.filter(
          (e: R) => e.date >= cutoff.slice(0, 10),
        ),
        revenue = sales.reduce((s: number, o: R) => s + o.total, 0),
        cost = expenses.reduce((s: number, e: R) => s + e.amount, 0);
      return (
        <>
          {title(
            "Earnings",
            "Completed sales less your recorded expenses.",
            <select
              aria-label="Date range"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {["All time", "This month", "Last 30 days"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>,
          )}
          <div className="stats">
            {[
              ["Completed sales", revenue],
              ["Recorded expenses", cost],
              ["Estimated profit", revenue - cost],
            ].map(([label, n]) => (
              <div key={label}>
                <span>{t(String(label))}</span>
                <strong>{money(Number(n))}</strong>
              </div>
            ))}
          </div>
          <div className="section-heading">
            <h2>Expense ledger</h2>
            <button
              className="button secondary"
              onClick={() => setModal({ type: "expense" })}
            >
              <Plus size={16} />
              {t("Add expense")}
            </button>
          </div>
          {expenses.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e: R) => (
                    <tr key={e.id}>
                      <td>{date(e.date)}</td>
                      <td>{e.description}</td>
                      <td>{money(e.amount)}</td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label="Delete expense"
                          onClick={() =>
                            setModal({
                              type: "confirm",
                              title: "Delete this expense?",
                              text: "It will be removed from your earnings calculation.",
                              body: { action: "deleteExpense", id: e.id },
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No expenses recorded"
              text="Record fuel, ice, maintenance and other costs to understand your earnings."
            />
          )}
          <div className="section-heading section">
            <h2>Completed transactions</h2>
            <button
              className="text-link"
              onClick={() =>
                csv("earnings.csv", [
                  ["Order", "Date", "Total LKR"],
                  ...sales.map((o: R) => [o.id, o.created, o.total / 100]),
                ])
              }
            >
              Export CSV <ArrowUpRight size={16} />
            </button>
          </div>
          {sales.map((o: R) => (
            <div className="list-row" key={o.id}>
              <span>
                #{o.id.slice(0, 8)} · {date(o.created)}
              </span>
              <strong>{money(o.total)}</strong>
            </div>
          ))}
          <p className="small section">
            Sales include delivery charges. Estimated profit includes only
            expenses you have recorded.
          </p>
        </>
      );
    }
    const pending = work.orders.filter(
        (o: R) => o.seller_id === me.id && o.status === "awaiting",
      ),
      sales = work.orders.filter(
        (o: R) => o.seller_id === me.id && o.status === "completed",
      );
    return (
      <>
        {title(
          "Good day, " + me.name.split(" ")[0] + ".",
          "Your harbour, catches, and orders. All in one place.",
          <button
            className="button"
            onClick={() => {
              setImage("/images/tuna.png");
              setModal({ type: "catch" });
            }}
          >
            <Plus size={16} />
            {t("Add new catch")}
          </button>,
          me.harbor || me.district,
        )}
        {me.role !== "fisherman" &&
          notice(
            "Choose Fisherman in My profile to publish catches and receive orders.",
          )}
        {me.role === "fisherman" &&
          me.verification !== "verified" &&
          notice(
            "Your seller profile is awaiting review. You can prepare catch listings while the administrator reviews your details.",
          )}
        <div className="feature-panel">
          <div>
            <p className="eyebrow">A WELL-PLANNED DAY AT SEA</p>
            <h2>
              Check the waters.
              <br />
              Then plan your day.
            </h2>
            <p>
              Review marine conditions and official advisories before leaving
              harbour.
            </p>
            <A className="button secondary" to="/portal/weather">
              {t("Marine weather")} <ArrowRight size={16} />
            </A>
          </div>
          <img
            src="/images/ocean-hero.png"
            alt="Fishing boat on coastal waters"
          />
        </div>
        <div className="stats">
          <div>
            <span>Active catches</span>
            <strong>
              {work.listings.filter((l: R) => l.status === "active").length}
            </strong>
            <A to="/portal/catches" className="text-link">
              Manage catches <ArrowRight size={14} />
            </A>
          </div>
          <div>
            <span>New order requests</span>
            <strong>{pending.length}</strong>
            <A to="/portal/orders" className="text-link">
              Review orders <ArrowRight size={14} />
            </A>
          </div>
          <div>
            <span>{t("Completed sales")}</span>
            <strong>
              {money(sales.reduce((s: number, o: R) => s + o.total, 0))}
            </strong>
            <A to="/portal/earnings" className="text-link">
              {t("Earnings")} <ArrowRight size={14} />
            </A>
          </div>
        </div>
        <div className="section-heading">
          <h2>Your latest catches</h2>
          <A to="/portal/catches" className="text-link">
            View all <ArrowRight size={16} />
          </A>
        </div>
        {work.listings.length ? (
          work.listings.slice(0, 3).map((p: R) => (
            <div className="mini-product" key={p.id}>
              <img src={p.image} alt={p.name} />
              <div>
                <h3>{p.name}</h3>
                <p>
                  {p.stock / 1000} kg · {money(p.price)}/kg
                </p>
              </div>
              <Badge>{p.status}</Badge>
            </div>
          ))
        ) : (
          <Empty
            title="No catches listed yet"
            text="Your next connection starts with your first listing."
          />
        )}
      </>
    );
  }
  function adminView() {
    const types: R = {
        "Market prices": "price",
        "Official alerts": "alert",
        "Fishing stations": "station",
        Services: "service",
        Articles: "article",
        FAQs: "faq",
      },
      type = types[tab];
    return (
      <>
        {title(
          tab === "Overview" ? "Super admin overview" : tab,
          "Manage the community with clear, accountable controls.",
          type ? (
            <button
              className="button"
              onClick={() => setModal({ type: "record", recordType: type })}
            >
              <Plus size={16} />
              Add {type}
            </button>
          ) : undefined,
          "PLATFORM OPERATIONS",
        )}
        {tab === "Overview" ? (
          <>
            <div className="stats">
              <div>
                <span>Community members</span>
                <strong>{admin.profiles.length}</strong>
              </div>
              <div>
                <span>Pending fishermen</span>
                <strong>
                  {
                    admin.profiles.filter(
                      (p: R) =>
                        p.role === "fisherman" && p.verification === "pending",
                    ).length
                  }
                </strong>
              </div>
              <div>
                <span>Orders</span>
                <strong>{admin.orders.length}</strong>
              </div>
            </div>
            <h2>Launch setup</h2>
            {[
              [true, "Email/password accounts and persistent storage"],
              [
                admin.profiles.some(
                  (p: R) =>
                    p.role === "fisherman" && p.verification === "verified",
                ),
                "Verified fishermen",
              ],
              [
                admin.listings.some((p: R) => p.status === "active"),
                "Approved catch listings",
              ],
              [
                admin.weatherConfigured,
                "Commercial marine forecast connection",
              ],
              [
                admin.records.some((r: R) => r.type === "price"),
                "Official price reports",
              ],
              [
                admin.records.some((r: R) => r.type === "station"),
                "Reviewed fishing station directory",
              ],
            ].map(([ok, label]) => (
              <div className="list-row" key={String(label)}>
                <span>{label}</span>
                <Badge tone={ok ? "green" : "amber"}>
                  {ok ? "Configured" : "Needs setup"}
                </Badge>
              </div>
            ))}
            <p className="small section">
              The weather connection requires a commercial Open-Meteo key in the
              server setting WEATHER_API_KEY. Official data needs ongoing
              operator review.
            </p>
            <h2 className="section">Recent admin activity</h2>
            {admin.audit.map((a: R) => (
              <div className="list-row" key={a.id}>
                <span>{a.action}</span>
                <small>{new Date(a.created).toLocaleString()}</small>
              </div>
            ))}
          </>
        ) : tab === "Users & verification" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Profile</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admin.profiles.map((p: R) => (
                  <tr key={p.id}>
                    <td>
                      {p.name}
                      <small>{p.email}</small>
                      <small>{p.phone}</small>
                    </td>
                    <td>
                      {p.role} · {p.district}
                      <small>
                        {p.harbor} · {p.vessel}
                      </small>
                    </td>
                    <td>
                      <Badge
                        tone={p.verification === "verified" ? "green" : ""}
                      >
                        {p.verification}
                      </Badge>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="text-link"
                          disabled={busy}
                          onClick={() =>
                            act(
                              {
                                action: "verify",
                                id: p.id,
                                status: "verified",
                              },
                              "Seller verified",
                            )
                          }
                        >
                          Verify
                        </button>
                        <button
                          className="text-link muted"
                          disabled={busy}
                          onClick={() =>
                            act(
                              { action: "verify", id: p.id, status: "pending" },
                              "Verification reset",
                            )
                          }
                        >
                          Reset
                        </button>
                        <button
                          className="text-link red"
                          onClick={() =>
                            setModal({
                              type: "confirm",
                              title: "Suspend this account?",
                              text: "Writes will be blocked and this seller’s catches will leave the public market.",
                              body: {
                                action: "verify",
                                id: p.id,
                                status: "suspended",
                              },
                            })
                          }
                        >
                          Suspend
                        </button>
                        {p.id !== "fisheries-super-admin" && (
                          <button
                            className="text-link"
                            disabled={busy}
                            onClick={async () => {
                              const d = await authAction("reset-link", {
                                id: p.id,
                              });
                              if (d)
                                setModal({
                                  type: "resetAccess",
                                  url: d.url,
                                  name: p.name,
                                });
                            }}
                          >
                            Reset access
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "Products" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Catch</th>
                  <th>Seller</th>
                  <th>Status</th>
                  <th>Price / kg</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admin.listings.map((p: R) => (
                  <tr key={p.id}>
                    <td>
                      {p.name}
                      <small>{p.stock / 1000} kg</small>
                    </td>
                    <td>{p.seller}</td>
                    <td>
                      <Badge>{p.status}</Badge>
                    </td>
                    <td>{money(p.price)}</td>
                    <td>
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() =>
                          act(
                            { action: "moderate", id: p.id, status: "active" },
                            "Catch approved",
                          )
                        }
                      >
                        Approve
                      </button>
                      <button
                        className="text-link muted"
                        disabled={busy}
                        onClick={() =>
                          act(
                            { action: "moderate", id: p.id, status: "hidden" },
                            "Catch hidden",
                          )
                        }
                      >
                        Hide
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!admin.listings.length && (
              <Empty
                title="No submitted catches"
                text="New listings appear here for moderation."
              />
            )}
          </div>
        ) : tab === "Orders" ? (
          <>
            <button
              className="text-link"
              onClick={() =>
                csv("orders.csv", [
                  ["Order", "Date", "Status", "Total LKR"],
                  ...admin.orders.map((o: R) => [
                    o.id,
                    o.created,
                    o.status,
                    o.total / 100,
                  ]),
                ])
              }
            >
              Export report <ArrowUpRight size={16} />
            </button>
            <div className="table-wrap section">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Fulfilment</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {admin.orders.map((o: R) => (
                    <tr key={o.id}>
                      <td>
                        #{o.id.slice(0, 8)}
                        <small>{date(o.created)}</small>
                      </td>
                      <td>
                        {o.name}
                        <small>{o.phone}</small>
                      </td>
                      <td>
                        {o.method}
                        <small>{o.address}</small>
                      </td>
                      <td>{money(o.total)}</td>
                      <td>
                        <Badge>{o.status}</Badge>
                        <div className="actions">
                          {nextStates(o.status, false).map((status) => (
                            <button
                              key={status}
                              className="text-link"
                              disabled={busy}
                              onClick={() =>
                                setModal({
                                  type: "confirm",
                                  title: "Change order to " + status + "?",
                                  text:
                                    status === "cancelled"
                                      ? "Reserved stock will be restored."
                                      : "Confirm this change after checking fulfilment with the seller.",
                                  body: {
                                    action: "orderStatus",
                                    id: o.id,
                                    status,
                                  },
                                })
                              }
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small">
              Payments are collected by sellers. Refund arrangements require
              operational follow-up.
            </p>
          </>
        ) : tab === "Complaints" ? (
          <>
            {admin.records
              .filter((r: R) => r.type === "complaint")
              .map((r: R) => (
                <article className="advisory" key={r.id}>
                  <Badge>{r.data.status}</Badge>
                  <h3>{r.data.subject}</h3>
                  <p>{r.data.message}</p>
                  <p className="small">
                    {r.data.email} · Order {r.data.orderId || "—"}
                  </p>
                  {r.data.status !== "resolved" && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        act(
                          { action: "resolveComplaint", id: r.id },
                          "Complaint resolved",
                        )
                      }
                    >
                      Mark resolved
                    </button>
                  )}
                </article>
              ))}
            {!admin.records.some((r: R) => r.type === "complaint") && (
              <Empty
                title="No complaints"
                text="Customer and seller issues appear here for review."
              />
            )}
          </>
        ) : type ? (
          <>
            {admin.records
              .filter((r: R) => r.type === type)
              .map((r: R) => (
                <div className="list-row" key={r.id}>
                  <div>
                    <h3>{r.data.title || r.data.name || r.data.question}</h3>
                    <p>
                      {r.data.market || r.data.area || r.data.district} ·{" "}
                      {date(r.created)}
                    </p>
                    {r.data.source && (
                      <a
                        className="text-link"
                        href={r.data.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source <ExternalLink size={14} />
                      </a>
                    )}
                    {r.data.published !== undefined && (
                      <Badge tone={r.data.published ? "green" : ""}>
                        {r.data.published ? "Published" : "Draft"}
                      </Badge>
                    )}
                  </div>
                  <div className="actions">
                    <button
                      className="text-link"
                      onClick={() =>
                        setModal({ type: "record", recordType: type, item: r })
                      }
                    >
                      Edit
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Delete record"
                      onClick={() =>
                        setModal({
                          type: "confirm",
                          title: "Remove this record?",
                          text: "It will no longer appear in the public information pages.",
                          body: { action: "deleteRecord", id: r.id },
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            {!admin.records.some((r: R) => r.type === type) && (
              <Empty
                title="No records published"
                text="Add reviewed information with its source. Published records appear in public information pages."
              />
            )}
          </>
        ) : null}
      </>
    );
  }
  function gateway() {
    return (
      <section className="gateway-section">
        <div className="section-heading">
          <div><p className="eyebrow">FISHERIES CONNECT</p><h2>What brings you here?</h2></div>
          <p className="gateway-intro">A marketplace for seafood.<br />A workspace for fishermen.</p>
        </div>
        <div className="gateway-grid">
          <A to="/explore" className="gateway-card explore-gateway">
            <img className="gateway-photo" src="/images/prawns.png" alt="Fresh prawns on ice" loading="lazy" />
            <div className="gateway-copy"><span className="gateway-kicker">BUY & DISCOVER</span><h3>Explore</h3><p>Browse seafood, find local sellers and plan your next purchase.</p><span className="gateway-action">Explore the market <ArrowUpRight size={23} /></span></div>
          </A>
          <A to="/portal" className="gateway-card fishermen-gateway">
            <img className="gateway-photo" src="/images/coastal-fishing.png" alt="Illustrative scene of fishermen tending nets beside a boat" loading="lazy" />
            <div className="gateway-copy"><span className="gateway-kicker">SELL & MANAGE</span><h3>For fishermen</h3><p>List your catch, manage orders and check conditions before heading out.</p><span className="gateway-action">{me ? "Open your portal" : "Sign in to your portal"} <ArrowUpRight size={23} /></span></div>
          </A>
        </div>
      </section>
    );
  }
  function stories() {
    const articles = entries("article");
    return (
      <section className="stories-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE JOURNAL</p>
            <h2>Life along the coast.</h2>
          </div>
          <A to="/articles" className="text-link">
            All stories <ArrowUpRight size={17} />
          </A>
        </div>
        <div className="stories-grid">
          {articles.slice(0, 2).map((r: R) => (
            <A
              className="story-card"
              key={r.id}
              to={"/articles/" + r.data.slug}
            >
              <div className="story-image">
                <img
                  src={r.data.image}
                  alt={
                    r.data.category === "OUR COAST"
                      ? "Coastal waters, illustrative image"
                      : "Seafood on ice"
                  }
                  loading="lazy"
                />
                <span>{r.data.category}</span>
              </div>
              <div className="story-copy">
                <small>Fisheries Connect journal · 2 min read</small>
                <h3>{r.data.title}</h3>
                <p>{r.data.excerpt}</p>
                <span className="text-link">
                  Read the story <ArrowUpRight size={17} />
                </span>
              </div>
            </A>
          ))}
        </div>
      </section>
    );
  }
  function faq() {
    const list = entries("faq").sort(
      (a: R, b: R) => (a.data.order || 0) - (b.data.order || 0),
    );
    return (
      <section className="faq-section">
        <div>
          <p className="eyebrow">HELP & SUPPORT</p>
          <h2>Your questions, answered.</h2>
          <p>
            Buying, selling and using Fisheries Connect.
          </p>
          <button
            className="text-link"
            onClick={() => setModal({ type: "complaint", id: "" })}
          >
            Get in touch <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="faq-list">
          {list.map((r: R) => (
            <details key={r.id}>
              <summary>
                {r.data.question}
                <Plus size={18} />
              </summary>
              <p>{r.data.answer}</p>
            </details>
          ))}
        </div>
      </section>
    );
  }
  function content() {
    if (isPortal && !me) return signin;
    if (path === "/login" || path === "/login/reset")
      return (
        <AuthForm
          reset={path.endsWith("/reset")}
          returnTo="/portal"
          onSuccess={authSuccess}
        />
      );
    if (path === "/faq") return faq();
    if (path === "/articles")
      return (
        <>
          {title(
            "Stories from our shore.",
            "People, seafood and the places that connect us.",
          )}
          {stories()}
        </>
      );
    if (path.startsWith("/articles/")) {
      const r = entries("article").find(
        (r: R) => path === "/articles/" + r.data.slug,
      );
      return r ? (
        <article className="article-page">
          <A to="/articles" className="text-link">
            <ArrowLeft size={16} />
            All stories
          </A>
          <p className="eyebrow">{r.data.category}</p>
          <h1>{r.data.title}</h1>
          <p className="article-deck">{r.data.excerpt}</p>
          <img
            src={r.data.image}
            alt="Illustrative seafood and coastal imagery"
          />
          <div className="prose">
            {r.data.body.split(/\n\s*\n/).map((p: string, i: number) => (
              <p key={i}>{p}</p>
            ))}
            {r.data.source && (
              <a
                className="text-link"
                href={r.data.source}
                target="_blank"
                rel="noreferrer"
              >
                Background source <ExternalLink size={14} />
              </a>
            )}
          </div>
        </article>
      ) : (
        <Empty
          title="Story not found"
          text="This story may no longer be published."
        />
      );
    }
    if (path === "/explore")
      return (
        <>
          {title(
            "Explore the coast.",
            "Seafood, local sellers and useful information for your next trip.",
            undefined,
            "EXPLORE FISHERIES CONNECT",
          )}
          <div className="explore-tools">
            {[
              [
                "/market",
                "Seafood market",
                "Find the catch for your next meal.",
                Fish,
              ],
              [
                "/prices",
                "Compare market prices",
                "See reported prices across markets.",
                FileText,
              ],
              [
                "/sellers",
                "Nearby sellers",
                "Get to know the people behind the catch.",
                Users,
              ],
              [
                "/weather",
                "Marine weather",
                "Check conditions and official advisories.",
                CloudSun,
              ],
              [
                "/stations",
                "Fishing stations",
                "Find coastal support and landing sites.",
                Anchor,
              ],
              [
                "/articles",
                "Coastal stories",
                "A closer look at our local community.",
                Waves,
              ],
            ].map(([url, label, desc]: any) => (

              <A to={url} className="explore-tool" key={url}>
                <div className="explore-photo"><img src={"/images/" + ({"/market":"prawns.png","/prices":"tuna.png","/sellers":"coastal-fishing.png","/weather":"ocean-hero.png","/stations":"coastal-fishing.png","/articles":"crab.png"} as Record<string,string>)[url]} alt="" loading="lazy" /></div>
                <div className="explore-copy"><h2>{label}</h2><p>{desc}</p><span className="text-link">View <ArrowUpRight size={17} /></span></div>
              </A>
            ))}
          </div>
          {faq()}
        </>
      );
    if (path === "/")
      return (
        <>
          <section className="hero">
            <img
              className="hero-image"
              src="/images/ocean-hero.png"
              alt="Fishing boat in turquoise coastal water"
              fetchPriority="high"
            />
            <div className="hero-content">
              <p className="eyebrow">SRI LANKA’S SEAFOOD COMMUNITY</p>
              <h1>
                {t("Fresh seafood.")}
                <br />
                {t("A closer connection.")}
              </h1>
              <p>{t("Discover the daily catch from local fishermen.")}</p>
              <A className="button white" to="/explore">
                Explore the coast <ArrowRight size={19} />
              </A>
            </div>
            <span className="hero-location">
              <MapPin size={14} />
              Sri Lanka
            </span>
          </section>
          {gateway()}
          {stories()}
          {faq()}
        </>
      );
    if (path === "/market") {
      const list = catalogue
        .filter(
          (p: R) =>
            (category === "All seafood" || p.category === category) &&
            (location === "All locations" || p.district === location) &&
            (p.name + " " + p.seller + " " + p.district)
              .toLowerCase()
              .includes(search.toLowerCase()) &&
            (!maxPrice || p.price <= Number(maxPrice) * 100),
        )
        .sort((a: R, b: R) =>
          sort === "Price: low to high"
            ? a.price - b.price
            : sort === "Price: high to low"
              ? b.price - a.price
              : 0,
        );
      return (
        <>
          {title(
            "Fresh finds. From local waters.",
            "Good seafood starts with knowing where it comes from.",
            undefined,
            "THE SEAFOOD MARKET",
          )}
          <div className="toolbar">
            <div className="search-input">
              <Search size={18} />
              <input
                placeholder={t("Search seafood")}
                aria-label="Search seafood"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="All locations">{t("All locations")}</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input
              className="max-price"
              aria-label="Maximum price per kg"
              placeholder="Max LKR / kg"
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <div className="category-bar">
            <div className="tabs">
              {["All seafood", ...categories].map((c) => (
                <button
                  className={category === c ? "active" : ""}
                  key={c}
                  onClick={() => setCategory(c)}
                >
                  {t(c)}
                </button>
              ))}
            </div>
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {[
                "Fresh arrivals",
                "Price: low to high",
                "Price: high to low",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="section-heading">
            <h2>
              {t("Seafood market")} <small>{list.length}</small>
            </h2>
            {!data.listings.length && (
              <Badge>{t("Sample listings & prices")}</Badge>
            )}
          </div>
          {!data.listings.length && (
            <p className="small">
              Sample catches let you explore the experience. Purchasing opens
              when verified sellers publish real listings.
            </p>
          )}
          {list.length ? (
            <div className="product-grid">{list.map((p: R) => card(p))}</div>
          ) : (
            <Empty
              title={t("No results found")}
              text="Try a different species, location, or price range."
            />
          )}
        </>
      );
    }
    if (product) {
      const p = product,
        seller = data.sellers.find((s: R) => s.id === p.seller_id),
        reviews = data.reviews.filter((r: R) => r.seller_id === p.seller_id);
      return (
        <>
          <A className="breadcrumb" to="/market">
            <ArrowLeft size={16} />
            {t("Seafood market")} / {p.name}
          </A>
          <div className="product-detail">
            <div>
              <img className="detail-photo" src={p.image} alt={p.name} />
              <p className="small muted">
                {p.sample
                  ? "Illustrative product photography. Actual catches vary."
                  : "Photo provided for this listing."}
              </p>
            </div>
            <section>
              <p className="eyebrow">
                {p.district} · {p.category}
              </p>
              <h1>{p.name}</h1>
              <p>{p.description}</p>
              <p className="detail-price">
                {money(p.price)} <span>/ kg</span>
              </p>
              <Badge tone={p.sample ? "" : "green"}>
                {p.sample ? "Preview listing" : "Verified seller"}
              </Badge>
              <div className="detail-meta">
                <div>
                  <span>Available</span>
                  <strong>{p.stock / 1000} kg</strong>
                </div>
                <div>
                  <span>Landing area</span>
                  <strong>{p.district}</strong>
                </div>
                {p.landed && (
                  <div>
                    <span>Landing date</span>
                    <strong>{date(p.landed)}</strong>
                  </div>
                )}
              </div>
              <Field label={t("Quantity") + " (kg)"}>
                <div className="quantity">
                  <button
                    aria-label="Reduce quantity"
                    onClick={() => setQty(Math.max(0.25, qty - 0.25))}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    aria-label="Weight in kilograms"
                    type="number"
                    min="0.25"
                    step="0.25"
                    max={p.stock / 1000}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                  />
                  <button
                    aria-label="Increase quantity"
                    onClick={() => setQty(Math.min(p.stock / 1000, qty + 0.25))}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </Field>
              <Field label={t("Preparation")}>
                <div className="segmented">
                  {["Whole", "Cleaned", "Cut"].map((c) => (
                    <button
                      className={prep === c ? "selected" : ""}
                      key={c}
                      onClick={() => setPrep(c)}
                    >
                      {t(c)}
                    </button>
                  ))}
                </div>
              </Field>
              <p className="small">
                {prep === "Whole"
                  ? "No preparation charge."
                  : "Preparation: " +
                    money(p.cleaning) +
                    " / kg, charged on ordered weight."}
              </p>
              <div className="price-summary">
                <span>Subtotal</span>
                <strong>
                  {money(
                    subtotal(
                      p.price,
                      prep === "Whole" ? 0 : p.cleaning,
                      Math.round(qty * 1000),
                    ),
                  )}
                </strong>
              </div>
              <button
                className="button full"
                disabled={busy || p.sample}
                onClick={async () => {
                  if (qty < 0.25 || qty * 1000 > p.stock) {
                    setToast(
                      "Choose an available quantity of at least 0.25 kg.",
                    );
                    return;
                  }
                  if (p.seller_id === me?.id) {
                    setToast("You cannot buy your own catch.");
                    return;
                  }
                  const next = {
                    id: p.id,
                    grams: Math.round(qty * 1000),
                    preparation: prep,
                  };
                  if (
                    cartLines[0]?.p &&
                    cartLines[0].p.seller_id !== p.seller_id
                  ) {
                    setModal({ type: "replaceCart", item: next });
                    return;
                  }
                  if (
                    await saveCart([...cart.filter((c) => c.id !== p.id), next])
                  )
                    setToast("Added to your basket");
                }}
              >
                <ShoppingBag size={18} />
                {p.sample
                  ? "Sample — not available to order"
                  : t("Add to basket")}
              </button>
              {p.sample ? (
                <p className="small">
                  This sample does not create an order or payment.
                </p>
              ) : (
                <div className="seller-inline">
                  <Store size={22} />
                  <div>
                    <strong>{p.seller}</strong>
                    <p>
                      {seller?.harbor || p.district} ·{" "}
                      {seller?.delivery ? "Pickup & delivery" : "Pickup only"}
                    </p>
                  </div>
                  <A className="text-link" to={"/sellers/" + p.seller_id}>
                    View seller <ArrowUpRight size={15} />
                  </A>
                </div>
              )}
            </section>
          </div>
          <section className="section">
            <h2>{t("Reviews")}</h2>
            {reviews.length ? (
              reviews.map((r: R, i: number) => (
                <article className="review" key={i}>
                  <strong>{r.buyer}</strong>
                  <span className="stars">
                    {r.rating}/5 <Star size={13} />
                  </span>
                  <p>{r.comment}</p>
                  <small>Verified purchase · {date(r.created)}</small>
                </article>
              ))
            ) : (
              <p className="muted">
                No reviews yet. Reviews are available after completed purchases.
              </p>
            )}
          </section>
        </>
      );
    }
    if (path === "/sellers" || path.startsWith("/sellers/")) {
      const sid = path.split("/")[2],
        list = data.sellers.filter(
          (s: R) =>
            (!sid || s.id === sid) &&
            (location === "All locations" || s.district === location) &&
            (s.name + " " + s.district)
              .toLowerCase()
              .includes(search.toLowerCase()),
        );
      return (
        <>
          {title(
            "Nearby sellers",
            "Meet the people behind your catch. Shop directly from verified local fishermen.",
            undefined,
            "OUR COASTAL COMMUNITY",
          )}
          <div className="toolbar">
            <div className="search-input">
              <Search size={18} />
              <input
                aria-label="Search sellers"
                placeholder="Search sellers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option>All locations</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          {list.length ? (
            list.map((s: R) => {
              const items = data.listings.filter(
                  (p: R) => p.seller_id === s.id,
                ),
                reviews = data.reviews.filter((r: R) => r.seller_id === s.id);
              return (
                <section className="seller-section" key={s.id}>
                  <div className="seller-heading">
                    <span className="avatar">
                      <Anchor size={25} />
                    </span>
                    <div>
                      <h2>{s.name}</h2>
                      <p>
                        {s.harbor || s.district} ·{" "}
                        {s.delivery ? "Pickup & delivery" : "Pickup only"}
                      </p>
                    </div>
                    <Badge tone="green">
                      <ShieldCheck size={13} />
                      Verified
                    </Badge>
                  </div>
                  <p className="small">
                    {reviews.length
                      ? (
                          reviews.reduce(
                            (sum: number, r: R) => sum + r.rating,
                            0,
                          ) / reviews.length
                        ).toFixed(1) +
                        " / 5 · " +
                        reviews.length +
                        " verified reviews"
                      : "No purchase reviews yet"}
                  </p>
                  {items.length ? (
                    <div className="product-grid">
                      {items.map((p: R) => card(p))}
                    </div>
                  ) : (
                    <p className="muted">No catches currently available.</p>
                  )}
                  {sid &&
                    reviews.map((r: R, i: number) => (
                      <article className="review" key={i}>
                        <strong>
                          {r.buyer} · {r.rating}/5
                        </strong>
                        <p>{r.comment}</p>
                      </article>
                    ))}
                </section>
              );
            })
          ) : (
            <Empty
              title="No verified sellers yet"
              text="Our community is taking shape. Create a fisherman profile and submit your first catch."
            >
              <A className="button" to="/portal/profile">
                {t("Join as a fisherman")} <ArrowRight size={16} />
              </A>
            </Empty>
          )}
        </>
      );
    }
    if (path.endsWith("/weather")) return weatherView();
    if (path.endsWith("/prices")) return pricesView();
    if (path.endsWith("/stations")) return directory("station");
    if (path.endsWith("/services")) return directory("service");
    if (path.endsWith("/sos")) return sos();
    if (path === "/cart" || path === "/checkout")
      return (
        <>
          {title(
            path === "/checkout" ? "Checkout" : "Your basket",
            "One seller per checkout. Clear prices, no surprises.",
          )}{" "}
          {!cart.length ? (
            <Empty
              title="Your basket is waiting"
              text="Find something fresh at the market and add it to your basket."
            >
              <A to="/market" className="button">
                {t("Explore the market")} <ArrowRight size={16} />
              </A>
            </Empty>
          ) : (
            <div className="checkout-layout">
              <div>
                {cartLines.map((c) => (
                  <article className="cart-line" key={c.id}>
                    {c.p && <img src={c.p.image} alt={c.p.name} />}
                    <div>
                      <h3>{c.p?.name || "Unavailable product"}</h3>
                      <p>
                        {c.grams / 1000} kg · {c.preparation}
                      </p>
                      {c.p && (
                        <p className="small">
                          {money(c.p.price)}/kg
                          {c.preparation !== "Whole" &&
                            " + " + money(c.p.cleaning) + "/kg preparation"}
                        </p>
                      )}
                      <div className="actions">
                        <button
                          className="text-link muted"
                          disabled={busy}
                          onClick={() =>
                            saveCart(cart.filter((x) => x.id !== c.id))
                          }
                        >
                          {t("Remove")}
                        </button>
                        {c.p && (
                          <>
                            <button
                              className="icon-button"
                              aria-label="Reduce weight"
                              disabled={busy}
                              onClick={() =>
                                saveCart(
                                  cart.map((x) =>
                                    x.id === c.id
                                      ? {
                                          ...x,
                                          grams: Math.max(250, x.grams - 250),
                                        }
                                      : x,
                                  ),
                                )
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label="Increase weight"
                              disabled={busy}
                              onClick={() =>
                                saveCart(
                                  cart.map((x) =>
                                    x.id === c.id
                                      ? {
                                          ...x,
                                          grams: Math.min(
                                            c.p.stock,
                                            x.grams + 250,
                                          ),
                                        }
                                      : x,
                                  ),
                                )
                              }
                            >
                              <Plus size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <strong>
                      {c.p
                        ? money(
                            subtotal(
                              c.p.price,
                              c.preparation === "Whole" ? 0 : c.p.cleaning,
                              c.grams,
                            ),
                          )
                        : "—"}
                    </strong>
                  </article>
                ))}
                {path === "/checkout" &&
                  (me ? (
                    <form
                      id="checkout-form"
                      className="panel section"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget),
                          r = await act(
                            {
                              action: "checkout",
                              items: cart,
                              method,
                              address: v(f, "address"),
                              phone: v(f, "phone"),
                              name: v(f, "name"),
                              key: requestKey,
                            },
                            "Order placed. Awaiting seller confirmation.",
                          );
                        if (r) {
                          setCart([]);
                          localStorage.removeItem("fc-cart");
                          setRequestKey(requestId());
                          go("/orders");
                        }
                      }}
                    >
                      <h2>Collection details</h2>
                      <div className="segmented">
                        <button
                          type="button"
                          className={method === "pickup" ? "selected" : ""}
                          onClick={() => setMethod("pickup")}
                        >
                          {t("Pickup")}
                        </button>
                        <button
                          type="button"
                          className={method === "delivery" ? "selected" : ""}
                          disabled={!cartSeller?.delivery}
                          onClick={() => setMethod("delivery")}
                        >
                          {t("Delivery")}
                        </button>
                      </div>
                      <p className="small">
                        {method === "pickup"
                          ? "Collect from " +
                            (cartSeller?.harbor ||
                              cartSeller?.district ||
                              "your seller") +
                            " after the seller confirms your order is ready."
                          : "Local delivery in " +
                            cartSeller?.district +
                            ". The seller confirms your request."}
                      </p>
                      <div className="form-grid">
                        <Field label={t("Name")}>
                          <input name="name" required defaultValue={me.name} />
                        </Field>
                        <Field label={t("Phone")}>
                          <input
                            name="phone"
                            type="tel"
                            required
                            defaultValue={me.phone}
                          />
                        </Field>
                      </div>
                      {method === "delivery" && (
                        <Field label={t("Address")}>
                          <textarea
                            name="address"
                            required
                            minLength={10}
                            placeholder="Street, area, city, and delivery instructions"
                          />
                        </Field>
                      )}
                      <h3>Payment</h3>
                      <p>
                        Cash on {method === "pickup" ? "pickup" : "delivery"}.
                        No online payment is taken.
                      </p>
                      <label className="check">
                        <input type="checkbox" required />I confirm my contact
                        details and agree to pay the total when receiving the
                        order.
                      </label>
                    </form>
                  ) : (
                    signin
                  ))}
              </div>
              <aside className="order-summary">
                <h2>Order summary</h2>
                <p>{cartSeller?.name || "Your selected seller"}</p>
                <div className="list-row">
                  <span>Items & preparation</span>
                  <span>{money(total)}</span>
                </div>
                <div className="list-row">
                  <span>{t("Delivery")}</span>
                  <span>
                    {path === "/checkout" && method === "delivery"
                      ? money(cartSeller?.delivery_fee || 0)
                      : "—"}
                  </span>
                </div>
                <div className="total">
                  <span>{t("Order total")}</span>
                  <strong>
                    {money(
                      total +
                        (path === "/checkout" && method === "delivery"
                          ? cartSeller?.delivery_fee || 0
                          : 0),
                    )}
                  </strong>
                </div>
                {path === "/checkout" ? (
                  <button
                    className="button full"
                    form="checkout-form"
                    disabled={
                      busy || !me || !online || cartLines.some((c) => !c.p)
                    }
                  >
                    {busy && <Loader2 className="spin" size={17} />}{" "}
                    {t("Place order")}
                  </button>
                ) : (
                  <A className="button full" to="/checkout">
                    {t("Checkout")} <ArrowRight size={17} />
                  </A>
                )}
                <p className="small">
                  Your seller must accept the order before it is confirmed.
                  Availability and pricing are checked again at submission.
                </p>
                <A to="/market" className="text-link">
                  {t("Continue shopping")}
                </A>
              </aside>
            </div>
          )}
        </>
      );
    if (path === "/account" || path === "/portal/profile")
      return me ? profile() : signin;
    if (path === "/orders") return me ? orderView() : signin;
    if (isPortal) return me ? fisherman() : signin;
    if (isAdmin)
      return !me?.isAdmin ? (
        <AuthForm admin returnTo="/admin" onSuccess={authSuccess} />
      ) : me.isAdmin ? (
        adminView()
      ) : (
        <Empty
          title="Administrator access required"
          text="Only the platform owner can access these operations."
        />
      );
    if (path === "/about")
      return (
        <>
          {title(
            "A closer connection to our coast.",
            "Fisheries Connect brings local fishermen and seafood shoppers together.",
          )}
          <div className="prose">
            <h2>One coast. One community.</h2>
            <p>
              Explore local catches, choose how your seafood is prepared, and
              arrange pickup or local delivery. Fishermen can manage listings,
              orders, and earnings with marine information and essential
              contacts close at hand.
            </p>
            <h2>Clear information</h2>
            <p>
              Sellers and listings are reviewed before public sale. Reference
              prices and official notices include their source. Unavailable
              information is shown clearly.
            </p>
            <A to="/portal/profile" className="button">
              Join our community <ArrowRight size={16} />
            </A>
          </div>
        </>
      );
    if (path === "/privacy" || path === "/terms")
      return (
        <>
          {title(
            path === "/privacy"
              ? "Privacy & your information"
              : "Shopping & platform terms",
          )}
          <div className="prose">
            {path === "/privacy" ? (
              <>
                <h2>Information we use</h2>
                <p>
                  Your account uses your email, username and a securely hashed
                  application password. This application stores your profile,
                  contact details, catches, orders, expenses, and reviews to
                  provide its services.
                </p>
                <h2>Who can see your information?</h2>
                <p>
                  Public seller profiles show business name, location, harbour
                  and fulfilment options. Order contact and address details are
                  shared with the seller and administrators. Your trusted
                  contacts remain private.
                </p>
                <h2>Location and your choices</h2>
                <p>
                  Emergency coordinates stay on your device unless you choose to
                  share them. Update your profile anytime. Use the support form
                  to request a data export, account review or deletion;
                  operational order records may require retention.
                </p>
              </>
            ) : (
              <>
                <h2>Orders and payment</h2>
                <p>
                  Each checkout contains products from one seller. Preparation
                  and delivery charges are shown before submission. Cash is paid
                  on pickup or delivery, after the seller accepts your request.
                </p>
                <h2>Cancellations and issues</h2>
                <p>
                  You can cancel while an order is awaiting acceptance. After
                  acceptance, contact the seller or submit an issue. Refund
                  arrangements are handled directly with the seller.
                </p>
                <h2>Marine information</h2>
                <p>
                  Reported prices are reference figures. Forecasts are not
                  navigation guidance. Location sharing is not rescue dispatch
                  and does not guarantee message delivery.
                </p>
              </>
            )}
            <button
              className="button secondary"
              onClick={() => setModal({ type: "complaint", id: "" })}
            >
              Contact the operator
            </button>
            <p className="small section">
              Before public launch, the operator must publish its legal
              identity, contact details, retention schedule, final terms and
              fulfilment procedures.
            </p>
          </div>
        </>
      );
    return (
      <Empty
        title="This page could not be found"
        text="Let’s get you back to the coast."
      >
        <A className="button" to="/">
          Go home <ArrowRight size={16} />
        </A>
      </Empty>
    );
  }
  function dialogs() {
    if (modal?.type === "resetAccess")
      return (
        <>
          <h2>Reset access for {modal.name}</h2>
          <p>
            Share this link only after verifying the account owner. It works
            once and expires in 30 minutes. No email has been sent.
          </p>
          <p className="reset-link">{modal.url}</p>
          <button
            className="button"
            onClick={() =>
              navigator.clipboard
                .writeText(modal.url)
                .then(() => setToast("Reset link copied"))
                .catch(() => setToast("Select and copy the link above."))
            }
          >
            Copy reset link
          </button>
        </>
      );
    if (!modal) return null;
    if (modal.type === "catch") {
      const p = modal.item;
      return (
        <>
          <h2>{p ? "Edit catch" : t("Add new catch")}</h2>
          <p>Use a clear photo and accurate weight and price.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                r = await act(
                  {
                    action: "listing",
                    id: p?.id,
                    name: v(f, "name"),
                    category: v(f, "category"),
                    description: v(f, "description"),
                    image,
                    price: Math.round(Number(f.get("price")) * 100),
                    stock: Math.round(Number(f.get("stock")) * 1000),
                    cleaning: Math.round(Number(f.get("cleaning")) * 100),
                    district: v(f, "district"),
                    landed: v(f, "landed"),
                  },
                  "Catch submitted for review",
                );
              if (r) setModal(null);
            }}
          >
            <div className="upload-row">
              <img src={image} alt="Catch preview" />
              <div>
                <Field label="Product photo">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBusy(true);
                      try {
                        const f = new FormData();
                        f.set("file", file);
                        const r = await fetch("/api/media", {
                            method: "POST",
                            body: f,
                          }),
                          d: R = await r.json();
                        if (!r.ok) throw Error(d.error);
                        setImage(d.url);
                        setToast("Photo uploaded");
                      } catch (e) {
                        setToast(
                          e instanceof Error ? e.message : "Upload failed",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </Field>
                <small>JPEG, PNG or WebP · Up to 5 MB</small>
                <select
                  aria-label="Illustrative product photo"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                >
                  {["tuna", "prawns", "crab", "squid"].map((s) => (
                    <option key={s} value={"/images/" + s + ".png"}>
                      {s} sample photo
                    </option>
                  ))}
                  {image.startsWith("/api/") && (
                    <option value={image}>Your uploaded photo</option>
                  )}
                </select>
              </div>
            </div>
            <div className="form-grid">
              <Field label="Species / product name">
                <input
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={p?.name}
                />
              </Field>
              <Field label="Category">
                <select name="category" defaultValue={p?.category || "Fish"}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Price per kg") + " · LKR"}>
                <input
                  name="price"
                  type="number"
                  min="1"
                  step=".01"
                  required
                  defaultValue={p ? p.price / 100 : undefined}
                />
              </Field>
              <Field label={t("Available kg")}>
                <input
                  name="stock"
                  type="number"
                  min="0"
                  step=".25"
                  required
                  defaultValue={p ? p.stock / 1000 : undefined}
                />
              </Field>
              <Field label="Preparation charge / kg · LKR">
                <input
                  name="cleaning"
                  type="number"
                  min="0"
                  step=".01"
                  required
                  defaultValue={p ? p.cleaning / 100 : 100}
                />
              </Field>
              <Field label={t("Location")}>
                <select
                  name="district"
                  defaultValue={p?.district || me?.district}
                >
                  {districts.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Landing date")}>
                <input
                  name="landed"
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  defaultValue={
                    p?.landed || new Date().toISOString().slice(0, 10)
                  }
                />
              </Field>
            </div>
            <Field label={t("Description")}>
              <textarea
                name="description"
                required
                minLength={10}
                maxLength={2000}
                defaultValue={p?.description}
              />
            </Field>
            <p className="small">
              Catches and edits are reviewed before publication. Use a genuine
              catch photo for public sales.
            </p>
            <button
              className="button full"
              disabled={busy || me?.role !== "fisherman"}
            >
              {t("Submit for review")} <ArrowRight size={16} />
            </button>
            {me?.role !== "fisherman" && (
              <p className="error-text">
                Choose Fisherman in My profile first.
              </p>
            )}
          </form>
        </>
      );
    }
    if (modal.type === "expense")
      return (
        <>
          <h2>{t("Add expense")}</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await act(
                  {
                    action: "expense",
                    description: v(f, "description"),
                    amount: Math.round(Number(f.get("amount")) * 100),
                    date: v(f, "date"),
                  },
                  "Expense recorded",
                )
              )
                setModal(null);
            }}
          >
            <Field label={t("Description")}>
              <input
                name="description"
                required
                placeholder="Fuel, ice, repairs…"
              />
            </Field>
            <Field label={t("Amount") + " · LKR"}>
              <input name="amount" type="number" min="1" step=".01" required />
            </Field>
            <Field label={t("Date")}>
              <input
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </Field>
            <button className="button" disabled={busy}>
              {t("Save")}
            </button>
          </form>
        </>
      );
    if (modal.type === "review")
      return (
        <>
          <h2>{t("Write a review")}</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await act(
                  {
                    action: "review",
                    orderId: modal.id,
                    rating: Number(f.get("rating")),
                    comment: v(f, "comment"),
                  },
                  "Thank you for your review",
                )
              )
                setModal(null);
            }}
          >
            <Field label="Rating">
              <select name="rating">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Your experience">
              <textarea
                name="comment"
                required
                minLength={3}
                maxLength={1000}
              />
            </Field>
            <button className="button" disabled={busy}>
              {t("Submit")}
            </button>
          </form>
        </>
      );
    if (modal.type === "complaint")
      return (
        <>
          <h2>Contact the operator</h2>
          {!me ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await authAction("help", {
                    identity: v(f, "email"),
                    name: v(f, "name"),
                    message: v(f, "message"),
                  })
                ) {
                  setModal(null);
                  setToast("Your support request has been recorded.");
                }
              }}
            >
              <Field label="Your name">
                <input name="name" required minLength={2} maxLength={80} />
              </Field>
              <Field label="Your account email">
                <input name="email" type="email" required />
              </Field>
              <Field label="How can we help?">
                <textarea
                  name="message"
                  minLength={10}
                  maxLength={2000}
                  required
                />
              </Field>
              <button className="button" disabled={busy}>
                Send request
              </button>
              <p className="small">
                For urgent assistance, call the relevant authority. This form is
                reviewed by the operator.
              </p>
            </form>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await act(
                    {
                      action: "complaint",
                      orderId: modal.id || "",
                      subject: v(f, "subject"),
                      message: v(f, "message"),
                    },
                    "Your request has been recorded for administrator review",
                  )
                )
                  setModal(null);
              }}
            >
              <Field label="Subject">
                <input name="subject" maxLength={200} required />
              </Field>
              <Field label="How can we help?">
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </Field>
              <p className="small">
                This form is not an emergency channel. For urgent assistance,
                call the appropriate authority.
              </p>
              <button className="button" disabled={busy}>
                Submit request
              </button>
            </form>
          )}
        </>
      );
    if (modal.type === "record") {
      const type = modal.recordType,
        item = modal.item,
        fields: Record<string, string[]> = {
          price: [
            "name",
            "market",
            "wholesale",
            "retail",
            "previousWholesale",
            "previousRetail",
            "date",
            "source",
          ],
          article: [
            "title",
            "slug",
            "category",
            "excerpt",
            "body",
            "image",
            "source",
          ],
          faq: ["question", "answer", "order"],
          alert: [
            "title",
            "area",
            "severity",
            "details",
            "issued",
            "expires",
            "authority",
            "source",
          ],
          station: [
            "name",
            "district",
            "address",
            "phone",
            "services",
            "source",
          ],
          service: [
            "name",
            "district",
            "category",
            "phone",
            "details",
            "source",
          ],
        },
        values = item?.data || {};
      return (
        <>
          <h2>
            {item ? "Edit" : "Add"} {type}
          </h2>
          <p className="small">
            Review the content and its original source before publishing.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                d: R = {};
              fields[type].forEach(
                (k) =>
                  (d[k] = [
                    "retail",
                    "wholesale",
                    "previousWholesale",
                    "previousRetail",
                  ].includes(k)
                    ? v(f, k) === ""
                      ? null
                      : Math.round(Number(f.get(k)) * 100)
                    : k === "order"
                      ? Number(f.get(k))
                      : v(f, k)),
              );
              if (type === "faq" || type === "article")
                d.published = f.get("published") === "on";
              if (
                await act(
                  { action: "record", type, id: item?.id, data: d },
                  "Record saved",
                )
              )
                setModal(null);
            }}
          >
            {fields[type].map((k) => (
              <Field
                key={k}
                label={
                  k.charAt(0).toUpperCase() +
                  k.slice(1) +
                  (["retail", "wholesale"].includes(k) ? " · LKR / kg" : "")
                }
              >
                {k === "image" ? (
                  <select
                    name="image"
                    defaultValue={values.image || "/images/ocean-hero.png"}
                  >
                    {["ocean-hero", "tuna", "prawns", "crab", "squid"].map(
                      (x) => (
                        <option key={x} value={"/images/" + x + ".png"}>
                          {x}
                        </option>
                      ),
                    )}
                  </select>
                ) : k === "severity" ? (
                  <select name={k} defaultValue={values[k] || "Advisory"}>
                    {["Advisory", "Warning", "Severe"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                ) : k === "district" ? (
                  <select name={k} defaultValue={values[k]}>
                    {districts.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                ) : [
                    "address",
                    "details",
                    "services",
                    "body",
                    "excerpt",
                    "answer",
                  ].includes(k) ? (
                  <textarea name={k} required defaultValue={values[k]} />
                ) : (
                  <input
                    name={k}
                    required={
                      (![
                        "phone",
                        "wholesale",
                        "retail",
                        "previousWholesale",
                        "previousRetail",
                      ].includes(k) &&
                        (k !== "source" || type !== "article")) ||
                      (k === "phone" && type === "service")
                    }
                    type={
                      [
                        "retail",
                        "wholesale",
                        "previousWholesale",
                        "previousRetail",
                        "order",
                      ].includes(k)
                        ? "number"
                        : k === "source"
                          ? "url"
                          : k === "date"
                            ? "date"
                            : ["issued", "expires"].includes(k)
                              ? "datetime-local"
                              : "text"
                    }
                    min={
                      [
                        "retail",
                        "wholesale",
                        "previousWholesale",
                        "previousRetail",
                        "order",
                      ].includes(k)
                        ? 0
                        : undefined
                    }
                    step={
                      [
                        "retail",
                        "wholesale",
                        "previousWholesale",
                        "previousRetail",
                      ].includes(k)
                        ? ".01"
                        : undefined
                    }
                    defaultValue={
                      [
                        "retail",
                        "wholesale",
                        "previousWholesale",
                        "previousRetail",
                      ].includes(k) && values[k] != null
                        ? values[k] / 100
                        : values[k]
                    }
                    placeholder={
                      k === "source"
                        ? "https://official-authority.gov.lk/report"
                        : undefined
                    }
                  />
                )}
              </Field>
            ))}
            <button className="button" disabled={busy}>
              Save record <Check size={16} />
            </button>
            {(type === "article" || type === "faq") && (
              <label className="check">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={values.published !== false}
                />
                Publish on the website
              </label>
            )}
          </form>
        </>
      );
    }
    if (modal.type === "replaceCart")
      return (
        <>
          <h2>Start a basket with this seller?</h2>
          <p>
            Each checkout supports one seller. Your existing basket will be
            replaced.
          </p>
          <div className="actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              {t("Cancel")}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                if (await saveCart([modal.item])) setModal(null);
              }}
            >
              Replace basket
            </button>
          </div>
        </>
      );
    if (modal.type === "confirm")
      return (
        <>
          <h2>{modal.title}</h2>
          <p>{modal.text}</p>
          <div className="actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              {t("Cancel")}
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                if (await act(modal.body, "Updated successfully"))
                  setModal(null);
              }}
            >
              Confirm
            </button>
          </div>
        </>
      );
    return null;
  }
  const nav = (
      <>
        <A to="/explore">Explore</A>
        <A to="/portal">For fishermen</A>
        <A to="/articles">Our coast</A>
      </>
    ),
    portalLinks: [string, string, any][] = [
      ["/portal", "Overview", LayoutDashboard],
      ["/portal/weather", "Marine weather", CloudSun],
      ["/portal/catches", "My catches", Fish],
      ["/portal/orders", "Orders", Package],
      ["/portal/prices", "Market prices", FileText],
      ["/portal/earnings", "Earnings", Wallet],
      ["/portal/services", "Equipment & services", Settings],
      ["/portal/stations", "Fishing stations", Anchor],
      ["/portal/profile", "My profile", User],
    ];
  return (
    <div className={isPortal || isAdmin ? "application" : "website"}>
      <header className="header">
        <A to="/" className="brand">
          <Waves size={40} strokeWidth={1.6} />
          <span>Fisheries Connect</span>
        </A>
        <nav className="desktop-nav">{nav}</nav>
        <div className="header-actions">
          <select
            className="language"
            aria-label="Language"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
            <option value="si">සිංහල</option>
          </select>
          <span className="header-divider" />
          {me ? (
            <A className="account-link" to="/account">
              {t("My account")}
            </A>
          ) : (
            <A className="account-link" to="/login">
              {t("Sign in")}
            </A>
          )}
          <A to="/cart" className="bag-link">
            <ShoppingBag size={24} strokeWidth={1.5} />
            {cart.length > 0 && <span>{cart.length}</span>}
            <span className="sr-only">{t("Your basket")}</span>
          </A>
          <button
            className="icon-button mobile-menu"
            aria-label="Navigation menu"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
      {menu && (
        <nav className="mobile-drawer">
          {nav}
          <A to="/orders">{t("Your orders")}</A>
          <A to="/portal">{t("Fisherman portal")}</A>
          <A to="/prices">{t("Market prices")}</A>
          <A to="/stations">{t("Fishing stations")}</A>
          <A to="/sos">{t("Emergency assistance")}</A>
          {me?.isAdmin && <A to="/admin">Admin</A>}
        </nav>
      )}
      {!online && (
        <div className="offline-banner" role="status">
          You’re offline. Reconnect for current stock, forecasts and order
          updates.
        </div>
      )}
      {error && (
        <div className="notice error-banner">
          <span>{error}</span>
          <button
            className="text-link"
            onClick={() => read().catch((e) => setError(e.message))}
          >
            Retry
          </button>
        </div>
      )}
      {(isPortal && me) || (isAdmin && me?.isAdmin) ? (
        <div className="app-layout">
          <aside className="sidebar">
            <p className="eyebrow">
              {isAdmin ? "PLATFORM OPERATIONS" : t("Fisherman portal")}
            </p>
            <nav>
              {isAdmin
                ? [
                    "Overview",
                    "Users & verification",
                    "Products",
                    "Orders",
                    "Market prices",
                    "Official alerts",
                    "Fishing stations",
                    "Services",
                    "Articles",
                    "FAQs",
                    "Complaints",
                  ].map((label) => (
                    <button
                      key={label}
                      className={tab === label ? "active" : ""}
                      onClick={() => setTab(label)}
                    >
                      {label === "Overview" ? (
                        <LayoutDashboard size={18} />
                      ) : label === "Users & verification" ? (
                        <Users size={18} />
                      ) : (
                        <FileText size={18} />
                      )}
                      <span>{label}</span>
                    </button>
                  ))
                : portalLinks.map(([url, label, Icon]) => (
                    <A
                      key={url}
                      to={url}
                      className={path === url ? "active" : ""}
                    >
                      <Icon size={18} />
                      <span>{t(label)}</span>
                    </A>
                  ))}
            </nav>
            <div className="sidebar-bottom">
              <button className="text-link" onClick={signout}>
                <User size={18} />
                Sign out
              </button>
              <A to="/market">
                <Store size={18} />
                {t("Shop seafood")}
              </A>
              <A className="red" to="/sos">
                <LifeBuoy size={18} />
                {t("Emergency assistance")}
              </A>
              {me?.isAdmin && (
                <A to={isAdmin ? "/portal" : "/admin"}>
                  <ShieldCheck size={18} />
                  {isAdmin ? t("Fisherman portal") : "Admin"}
                </A>
              )}
            </div>
          </aside>
          <main className="app-main">
            {loading ? (
              <div className="loading">
                <Loader2 className="spin" />
                Loading your workspace…
              </div>
            ) : (
              content()
            )}
          </main>
        </div>
      ) : (
        <main className={path === "/" ? "home-main" : "page-main"}>
          {loading && path !== "/" ? (
            <div className="loading">
              <Loader2 className="spin" />
              Loading…
            </div>
          ) : (
            content()
          )}
        </main>
      )}
      {!isPortal && !isAdmin && (
        <footer>
          <div className="footer-main">
            <div>
              <A className="brand" to="/">
                <Waves size={30} />
                <span>Fisheries Connect</span>
              </A>
              <p>
                A closer connection to our coast.
                <br />
                Built for Sri Lankan fishing communities.
              </p>
            </div>
            <div>
              <h4>Explore</h4>
              <A to="/market">{t("Seafood market")}</A>
              <A to="/sellers">{t("Nearby sellers")}</A>
              <A to="/prices">{t("Market prices")}</A>
              <A to="/weather">{t("Marine weather")}</A>
            </div>
            <div>
              <h4>For fishermen</h4>
              <A to="/portal">{t("Fisherman portal")}</A>
              <A to="/stations">{t("Fishing stations")}</A>
              <A to="/services">{t("Equipment & services")}</A>
              <A to="/sos">{t("Emergency assistance")}</A>
            </div>
            <div>
              <h4>Fisheries Connect</h4>
              <A to="/about">About our community</A>
              <A to="/faq">FAQs</A>
              <A to="/admin">Admin login</A>
              <A to="/orders">{t("Your orders")}</A>
              <button
                className="text-link muted"
                onClick={() => setModal({ type: "complaint", id: "" })}
              >
                Help & support
              </button>
              {me?.isAdmin && <A to="/admin">Admin dashboard</A>}
              {me && (
                <button className="text-link" onClick={signout}>
                  {t("Sign out")}
                </button>
              )}
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Fisheries Connect · Sri Lanka
            </span>
            <div>
              <A to="/privacy">Privacy</A>
              <A to="/terms">Terms</A>
            </div>
          </div>
        </footer>
      )}
      {!isPortal && !isAdmin && (
        <nav className="mobile-bottom">
          {[
            ["/", "Home", Waves],
            ["/market", "Shop seafood", Store],
            ["/orders", "Orders", Package],
            ["/account", "My account", User],
          ].map(([url, label, Icon]: any) => (
            <A key={url} className={path === url ? "active" : ""} to={url}>
              <Icon size={21} />
              <span>{t(label)}</span>
            </A>
          ))}
        </nav>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            <X size={17} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Fisheries Connect dialog"
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const nodes = e.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not([disabled]),input:not([disabled]),select,textarea,a[href]",
                  ),
                  first = nodes[0],
                  last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <button
              className="icon-button modal-close"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={21} />
            </button>
            {dialogs()}
          </section>
        </div>
      )}
    </div>
  );
}
