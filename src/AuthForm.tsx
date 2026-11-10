import { useState, FormEvent } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Anchor,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

export default function AuthForm({
  admin = false,
  reset = false,
  returnTo = "/portal",
  onSuccess,
}: {
  admin?: boolean;
  reset?: boolean;
  returnTo?: string;
  onSuccess: (path: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [show, setShow] = useState(false),
    [forgot, setForgot] = useState(false);
  const register = mode === "register" && !admin && !reset;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      fields = Object.fromEntries(f.entries());
    if (register && fields.password !== fields.confirm) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const token = reset
        ? new URLSearchParams(window.location.hash.slice(1)).get("token")
        : undefined;
      const r = await fetch(
          "/api/auth/" +
            (reset
              ? "reset"
              : admin
                ? "admin-login"
                : register
                  ? "register"
                  : "login"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...fields, token, returnTo }),
          },
        ),
        d = (await r.json()) as { error?: string; returnTo?: string };
      if (!r.ok) throw Error(d.error || "Unable to sign in.");
      await onSuccess(d.returnTo || returnTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={"auth-stage " + (admin ? "admin-auth" : "")}>
      <div className="auth-story">
        <span className="auth-symbol">
          {admin ? <ShieldCheck size={30} /> : <Anchor size={30} />}
        </span>
        <p className="eyebrow">
          {admin
            ? "FISHERIES CONNECT · ADMINISTRATION"
            : "YOUR WORK. YOUR COAST."}
        </p>
        <h1>
          {admin ? (
            <>
              A clear view.
              <br />
              Complete control.
            </>
          ) : (
            <>
              A better day
              <br />
              starts here.
            </>
          )}
        </h1>
        <p>
          {admin
            ? "Manage the marketplace, support the community and keep every detail in view."
            : "Your catches, your customers and your everyday tools. Together in one place."}
        </p>
        <div className="auth-story-foot">
          <span className="status-dot" />
          Fisheries Connect · Sri Lanka
        </div>
      </div>
      <div className="auth-card">
        <a className="text-link muted" href="/">
          <ArrowLeft size={16} />
          Back to the coast
        </a>
        <div className="auth-heading">
          <p className="eyebrow">
            {admin
              ? "PRIVATE WORKSPACE"
              : reset
                ? "ACCOUNT RECOVERY"
                : register
                  ? "JOIN THE COMMUNITY"
                  : "WELCOME BACK"}
          </p>
          <h2>
            {admin
              ? "Super admin login"
              : reset
                ? "Set a new password"
                : register
                  ? "Create your account"
                  : "Sign in to your account"}
          </h2>
          <p>
            {admin
              ? "Enter your admin email and application password."
              : reset
                ? "Choose a new password for your Fisheries Connect account."
                : register
                  ? "A few details, and you’re ready to get started."
                  : "Use your email or username to continue."}
          </p>
        </div>
        {!admin && !reset && (
          <div className="auth-tabs">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              className={register ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Create account
            </button>
          </div>
        )}
        <form key={mode + String(reset)} onSubmit={submit}>
          {register && (
            <>
              <label className="field">
                <span>Your name</span>
                <input
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                  placeholder="Full name"
                />
              </label>
              <label className="field">
                <span>Username</span>
                <input
                  name="username"
                  autoComplete="username"
                  pattern="[a-zA-Z0-9_]{3,30}"
                  minLength={3}
                  maxLength={30}
                  required
                  placeholder="Choose a username"
                />
                <small>3–30 letters, numbers or underscores.</small>
              </label>
            </>
          )}
          {!reset && (
            <label className="field">
              <span>
                {register || admin ? "Email address" : "Email or username"}
              </span>
              <input
                name="identity"
                type={register || admin ? "email" : "text"}
                autoComplete="username"
                maxLength={254}
                required
                placeholder={
                  admin
                    ? "admin@example.com"
                    : register
                      ? "you@example.com"
                      : "Your email or username"
                }
              />
            </label>
          )}
          <label className="field">
            <span>{reset ? "New password" : "Password"}</span>
            <div className="password-input">
              <input
                name="password"
                type={show ? "text" : "password"}
                autoComplete={
                  register || reset ? "new-password" : "current-password"
                }
                minLength={register || reset ? 12 : undefined}
                maxLength={128}
                required
                placeholder={
                  register || reset
                    ? "At least 12 characters"
                    : "Your application password"
                }
              />
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {register && (
            <>
              <label className="field">
                <span>Confirm password</span>
                <input
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              <label className="field">
                <span>I’m here to</span>
                <select
                  name="role"
                  defaultValue={
                    returnTo.startsWith("/portal") ? "fisherman" : "consumer"
                  }
                >
                  <option value="fisherman">Sell my catch · Fisherman</option>
                  <option value="consumer">Explore and buy seafood</option>
                </select>
              </label>
            </>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy
              ? "Please wait…"
              : admin
                ? "Open admin panel"
                : reset
                  ? "Save password"
                  : register
                    ? "Create account"
                    : "Sign in"}
            <ArrowRight size={17} />
          </button>
          {!register && !reset && (
            <button
              type="button"
              className="text-link auth-forgot"
              onClick={() => setForgot(!forgot)}
            >
              Forgot password?
            </button>
          )}
          {forgot && (
            <p className="small notice">
              {admin ? (
                "The Cloudflare account owner can reset admin access by running npm run admin:password from the project folder."
              ) : (
                <span>
                  Contact the operator through{" "}
                  <a href="/faq">Help &amp; support</a>. After verifying your
                  account, they can share a one-time password reset link.
                </span>
              )}
            </p>
          )}
          {register && (
            <p className="small auth-note">
              By creating an account, you agree to our{" "}
              <a href="/terms">terms</a> and{" "}
              <a href="/privacy">privacy policy</a>.
            </p>
          )}
          <p className="auth-note small">
            <LockKeyhole size={13} />
            Use a separate Fisheries Connect password.
          </p>
        </form>
      </div>
    </section>
  );
}
