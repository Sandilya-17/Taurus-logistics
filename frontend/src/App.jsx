import React, { useState } from "react";

const styles = {
  root: {
    margin: 0,
    padding: 0,
    fontFamily: "'Segoe UI', 'Inter', sans-serif",
  },
  page: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bgImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    zIndex: 0,
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(10,30,60,0.45) 100%)",
    zIndex: 1,
  },
  logoBar: {
    position: "absolute",
    top: 24,
    left: 36,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 38,
    height: 38,
    background: "#1a6fbd",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 20,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  logoSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: -2,
  },
  card: {
    position: "relative",
    zIndex: 2,
    background: "rgba(255,255,255,0.97)",
    borderRadius: 18,
    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
    padding: "48px 44px 40px",
    width: "100%",
    maxWidth: 420,
    backdropFilter: "blur(12px)",
  },
  cardTitle: {
    color: "#1a3a5c",
    fontSize: 28,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    color: "#7a8fa6",
    fontSize: 13.5,
    textAlign: "center",
    marginBottom: 32,
  },
  label: {
    display: "block",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#3d5166",
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inputWrap: {
    position: "relative",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    border: "1.5px solid #d0dce9",
    borderRadius: 10,
    fontSize: 15,
    color: "#1a2d42",
    background: "#f5f8fc",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  inputFocus: {
    borderColor: "#1a6fbd",
    boxShadow: "0 0 0 3px rgba(26,111,189,0.12)",
    background: "#fff",
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#7a8fa6",
    padding: 0,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.3,
  },
  loginBtn: {
    width: "100%",
    padding: "14px 0",
    background: "linear-gradient(90deg, #1a6fbd 0%, #1251a3 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.5,
    cursor: "pointer",
    marginTop: 8,
    boxShadow: "0 4px 18px rgba(26,111,189,0.35)",
    transition: "opacity 0.2s, transform 0.1s",
  },
  errorMsg: {
    color: "#d0021b",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
    background: "#fff0f2",
    borderRadius: 7,
    padding: "8px 12px",
    border: "1px solid #ffc0c8",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "rgba(255,255,255,0.55)",
    fontSize: 12.5,
    zIndex: 2,
    letterSpacing: 0.3,
  },
  taglineWrap: {
    position: "absolute",
    bottom: 60,
    left: 60,
    zIndex: 2,
  },
  taglineMain: {
    color: "#fff",
    fontWeight: 800,
    fontSize: 36,
    lineHeight: 1.15,
    textTransform: "uppercase",
    letterSpacing: 2,
    textShadow: "0 2px 12px rgba(0,0,0,0.45)",
  },
  taglineAccent: {
    display: "block",
    width: 54,
    height: 3,
    background: "#f5a623",
    borderRadius: 2,
    margin: "10px 0 8px",
  },
  taglineSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: 500,
  },
};

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IconPlane = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 3L3 10.5l6.75 2.25L12 21l2.25-5.25L21 3z"
      stroke="#fff"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const IconEmail = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
  >
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="#9fb4c8" strokeWidth="1.7" />
    <path d="M2 8l10 7 10-7" stroke="#9fb4c8" strokeWidth="1.7" />
  </svg>
);

const IconLock = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
  >
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="#9fb4c8" strokeWidth="1.7" />
    <path d="M8 11V7a4 4 0 018 0v4" stroke="#9fb4c8" strokeWidth="1.7" />
  </svg>
);

// ── Component ───────────────────────────────────────────────────────────────
export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    // Replace this block with your actual auth logic / API call
    setTimeout(() => {
      setLoading(false);
      setError("Invalid credentials. Please try again.");
    }, 1200);
  };

  return (
    <div style={styles.page}>
      {/* ── Full-bleed background image ── */}
      <img
        src="/assets/port-bg.jpg"      // ← swap this path to your actual image asset
        alt=""
        style={styles.bgImage}
      />
      <div style={styles.overlay} />

      {/* ── Logo (top-left) ── */}
      <div style={styles.logoBar}>
        <div style={styles.logoIcon}>
          <IconPlane />
        </div>
        <div>
          <div style={styles.logoText}>Taurus</div>
          <div style={styles.logoSub}>Trade &amp; Logistics</div>
        </div>
      </div>

      {/* ── Bottom-left tagline ── */}
      <div style={styles.taglineWrap}>
        <div style={styles.taglineMain}>
          Trading And<br />Moving Business
        </div>
        <span style={styles.taglineAccent} />
        <div style={styles.taglineSub}>Forward — Worldwide</div>
      </div>

      {/* ── Login Card ── */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Welcome Back</div>
        <div style={styles.cardSubtitle}>Sign in to your Taurus account</div>

        {error && <div style={styles.errorMsg}>{error}</div>}

        <div>
          {/* Email */}
          <div style={styles.inputWrap}>
            <label style={styles.label}>Email</label>
            <div style={{ position: "relative" }}>
              <IconEmail />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                style={{
                  ...styles.input,
                  paddingLeft: 40,
                  ...(emailFocused ? styles.inputFocus : {}),
                }}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div style={styles.inputWrap}>
            <label style={styles.label}>Password</label>
            <div style={{ position: "relative" }}>
              <IconLock />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                style={{
                  ...styles.input,
                  paddingLeft: 40,
                  paddingRight: 60,
                  ...(passFocused ? styles.inputFocus : {}),
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              ...styles.loginBtn,
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? "Signing in…" : "Login"}
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={styles.footer}>
        © 2026 Taurus Trade &amp; Logistics · All rights reserved
      </div>
    </div>
  );
}
