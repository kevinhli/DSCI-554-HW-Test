import { T } from "../utils/theme";

const LINKS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "methods", label: "About & Methods" },
];

export default function NavBar({ view, onNavigate }) {
  return (
    <header style={styles.frame}>
      <nav style={styles.bar} aria-label="Primary">
        <button
          type="button"
          style={styles.wordmark}
          onClick={() => onNavigate("dashboard")}
          aria-label="Open Fed to Front Door dashboard"
        >
          <span style={styles.wordmarkTitle}>Policy Ripple LA</span>
          <span style={styles.wordmarkSub}>Fed moves, mortgages, and Los Angeles neighborhoods</span>
        </button>

        <div style={styles.tabRail} role="tablist" aria-label="Primary pages">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              role="tab"
              aria-selected={view === link.id}
              onClick={() => onNavigate(link.id)}
              aria-current={view === link.id ? "page" : undefined}
              style={{
                ...styles.link,
                color: view === link.id ? T.textPrimary : T.textSecondary,
                borderColor: view === link.id ? T.cardBorder : "transparent",
                background: view === link.id ? T.cardBgActive : "transparent",
                boxShadow: view === link.id ? `inset 0 -2px 0 ${T.accent}` : "none",
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}

const styles = {
  frame: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(18px)",
    background: "rgba(18,18,20,0.78)",
    borderBottom: `1px solid ${T.cardBorder}`,
  },
  bar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    maxWidth: 1480,
    margin: "0 auto",
    padding: "14px 24px",
    fontFamily:
      '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif',
  },
  wordmark: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
  },
  wordmarkTitle: {
    fontFamily:
      '"Segoe UI Variable Display", "Aptos Display", "Aptos", "Inter", "Segoe UI", sans-serif',
    fontSize: 16,
    fontWeight: 800,
    color: T.textPrimary,
    letterSpacing: "-0.03em",
  },
  wordmarkSub: {
    fontSize: 11,
    fontWeight: 600,
    color: T.textDim,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  tabRail: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
    padding: 4,
    borderRadius: 16,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(17,17,19,0.76)",
  },
  link: {
    border: "1px solid transparent",
    borderRadius: 12,
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily:
      '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif',
    transition:
      "color 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
  },
};
