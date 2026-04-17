import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import { T } from "./utils/theme";
import App from "./App.jsx";

const style = document.createElement("style");
style.textContent = `
  :root {
    color-scheme: dark;
    --page-bg: ${T.pageBg};
    --card-bg: ${T.cardBg};
    --card-bg-alt: ${T.cardBgAlt};
    --card-border: ${T.cardBorder};
    --card-border-light: ${T.cardBorderLight};
    --card-border-emphasis: ${T.accent};
    --accent: ${T.accent};
    --accent-soft: ${T.accentGlow};
    --text-primary: ${T.textPrimary};
    --text-secondary: ${T.textSecondary};
    --text-dim: ${T.textDim};
  }
  *, *::before, *::after { box-sizing: border-box; }
  html {
    margin: 0;
    padding: 0;
    background:
      radial-gradient(circle at top left, ${T.accentGlowStrong} 0, transparent 26%),
      radial-gradient(circle at top right, rgba(74, 222, 128, 0.08) 0, transparent 28%),
      ${T.pageBg};
  }
  body {
    margin: 0;
    min-height: 100vh;
    background: transparent;
    color: var(--text-primary);
    font-family: "Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif;
    line-height: 1.5;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  #root { min-height: 100vh; }
  button, select, input, textarea {
    font: inherit;
  }
  button {
    color: inherit;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  svg {
    max-width: 100%;
  }
  ::selection {
    background: ${T.accentGlowStrong};
    color: ${T.textPrimary};
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes glow-pulse {
    0%, 100% { filter: drop-shadow(0 0 6px ${T.accentGlowStrong}); }
    50% { filter: drop-shadow(0 0 14px ${T.accentGlowStrong}); }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes borderFlash {
    0% { box-shadow: inset 3px 0 8px -2px var(--flash-color, ${T.accentGlowStrong}); }
    100% { box-shadow: none; }
  }
  @keyframes focusPulse {
    0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.22); }
    100% { box-shadow: 0 0 0 14px rgba(34, 211, 238, 0); }
  }
  @keyframes centerBreathe {
    0%, 100% { opacity: 0.15; }
    50% { opacity: 0.35; }
  }
  @keyframes badgePulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; }
  }
  @keyframes playheadGlow {
    0%, 100% { filter: drop-shadow(0 0 2px var(--ph-color, rgba(255,255,255,0.3))); }
    50% { filter: drop-shadow(0 0 6px var(--ph-color, rgba(255,255,255,0.5))); }
  }
  @keyframes beatTravel {
    0% { left: 10%; transform: scale(0.92); opacity: 0.55; }
    12% { left: 10%; transform: scale(1); opacity: 1; }
    50% { left: 45%; transform: scale(1); opacity: 0.95; }
    88% { left: 78%; transform: scale(0.96); opacity: 0.8; }
    100% { left: 78%; transform: scale(0.9); opacity: 0.5; }
  }
  @keyframes mapStateFadeIn {
    0% { opacity: 0.18; filter: saturate(0.72) brightness(0.92); }
    100% { opacity: 1; filter: none; }
  }
  @keyframes mapFocusRing {
    0% { opacity: 0; transform: scale(0.65); }
    28% { opacity: 0.85; }
    100% { opacity: 0; transform: scale(2.15); }
  }
  @keyframes mapFocusDot {
    0% { opacity: 0; transform: scale(0.4); }
    20% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.8); }
  }
  @keyframes chartLineDraw {
    0% { stroke-dashoffset: 1; opacity: 0.18; }
    100% { stroke-dashoffset: 0; opacity: 1; }
  }
  @keyframes chartFadeUp {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes chartPointIn {
    0% { opacity: 0; transform: scale(0.58); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes chartOpacityIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes chartBarGrow {
    0% { opacity: 0.4; transform: scaleX(0.08); }
    100% { opacity: 1; transform: scaleX(1); }
  }
  @keyframes chartMarkerReveal {
    0% { opacity: 0; transform: translateY(8px); }
    100% { opacity: 0.95; transform: translateY(0); }
  }
  @keyframes surfaceEnter {
    from { opacity: 0; transform: translateY(14px) scale(0.992); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .app-shell {
    max-width: 1480px;
    margin: 0 auto;
    padding: 24px 24px 56px;
  }
  .dashboard-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.95fr);
    gap: 20px;
    margin-bottom: 22px;
  }
  .dashboard-surface {
    background: linear-gradient(145deg, rgba(28, 28, 32, 0.94), rgba(24, 24, 28, 0.88));
    border: 1px solid rgba(46, 46, 52, 0.95);
    border-radius: 20px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(14px);
    animation: surfaceEnter 440ms cubic-bezier(0.22, 1, 0.36, 1) both;
    transition:
      opacity 360ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 360ms cubic-bezier(0.22, 1, 0.36, 1),
      border-color 220ms ease,
      box-shadow 220ms ease;
  }
  .hero-copy,
  .hero-panel,
  .control-surface,
  .meta-surface {
    padding: 18px;
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${T.textDim};
  }
  .eyebrow::before {
    content: "";
    width: 28px;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${T.accent});
  }
  .hero-title {
    margin: 12px 0 10px;
    font-family: "Segoe UI Variable Display", "Aptos Display", "Aptos", "Inter", "Segoe UI", sans-serif;
    font-size: clamp(2rem, 3.4vw, 3rem);
    line-height: 0.98;
    letter-spacing: -0.05em;
  }
  .hero-subtitle {
    max-width: 62ch;
    margin: 0;
    color: ${T.textSecondary};
    font-size: clamp(0.94rem, 1.1vw, 1rem);
    line-height: 1.6;
  }
  .hero-summary {
    margin-top: 18px;
    padding: 14px 16px;
    border-radius: 16px;
    border: 1px solid rgba(36, 36, 40, 1);
    background: linear-gradient(145deg, rgba(17, 17, 19, 0.94), rgba(25, 25, 30, 0.9));
  }
  .hero-summary-label {
    display: block;
    margin-bottom: 6px;
    color: ${T.textDim};
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .hero-summary-text {
    margin: 0;
    color: ${T.textPrimary};
    font-size: 1rem;
    line-height: 1.7;
  }
  .hero-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .hero-panel-kicker {
    margin: 0;
    color: ${T.textDim};
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .hero-panel-title {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.15;
    letter-spacing: -0.03em;
  }
  .hero-panel-copy {
    margin: 0;
    color: ${T.textSecondary};
    font-size: 0.95rem;
    line-height: 1.7;
  }
  .hero-chip-row,
  .hero-actions,
  .control-row,
  .legend-row,
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .hero-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .hero-stat {
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(46, 46, 52, 1);
    background: rgba(17, 17, 19, 0.78);
  }
  .hero-stat-label {
    display: block;
    margin-bottom: 5px;
    color: ${T.textDim};
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .hero-stat-value {
    display: block;
    color: ${T.textPrimary};
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.3;
  }
  .hero-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid rgba(46, 46, 52, 1);
    background: rgba(17, 17, 19, 0.8);
    color: ${T.textSecondary};
    font-size: 0.82rem;
    font-weight: 600;
  }
  .primary-button,
  .secondary-button,
  .ghost-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: transform 150ms ease, border-color 150ms ease, background 150ms ease, box-shadow 150ms ease, color 150ms ease;
  }
  .primary-button {
    background: linear-gradient(135deg, ${T.accent}, #1798b2);
    color: #071014;
    font-weight: 700;
    box-shadow: 0 10px 24px rgba(34, 211, 238, 0.2);
  }
  .secondary-button {
    background: rgba(17, 17, 19, 0.86);
    border-color: rgba(46, 46, 52, 1);
    color: ${T.textPrimary};
    font-weight: 600;
  }
  .ghost-button {
    background: transparent;
    border-color: rgba(46, 46, 52, 1);
    color: ${T.textSecondary};
    font-weight: 600;
  }
  .primary-button:hover,
  .secondary-button:hover,
  .ghost-button:hover {
    transform: translateY(-1px);
  }
  .control-surface {
    margin-bottom: 20px;
  }
  .control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    align-items: start;
  }
  .tab-strip {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    border: 1px solid rgba(46, 46, 52, 1);
    background: rgba(17, 17, 19, 0.76);
    width: fit-content;
    max-width: 100%;
  }
  .tab-button {
    min-height: 38px;
    padding: 0 14px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: transparent;
    color: ${T.textSecondary};
    font-size: 0.84rem;
    font-weight: 700;
    transition:
      background 180ms ease,
      color 180ms ease,
      border-color 180ms ease,
      transform 180ms ease,
      box-shadow 180ms ease;
  }
  .tab-button.active {
    color: ${T.textPrimary};
    background: ${T.cardBgActive};
    border-color: ${T.cardBorder};
    box-shadow: inset 0 -2px 0 ${T.accent};
  }
  .tab-button:hover {
    transform: translateY(-1px);
  }
  .control-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
  }
  .control-header-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }
  .control-header-copy {
    margin: 4px 0 0;
    color: ${T.textSecondary};
    font-size: 0.92rem;
  }
  .control-cluster {
    flex: 1 1 260px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .control-label {
    color: ${T.textDim};
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .control-hint {
    color: ${T.textSecondary};
    font-size: 0.84rem;
  }
  .stepper-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .section-heading {
    margin: 18px 0 12px;
  }
  .section-kicker {
    display: block;
    margin-bottom: 5px;
    color: ${T.textDim};
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .section-title {
    margin: 0;
    font-size: clamp(1.1rem, 2vw, 1.45rem);
    line-height: 1.2;
    letter-spacing: -0.03em;
  }
  .section-copy {
    margin: 6px 0 0;
    color: ${T.textSecondary};
    font-size: 0.94rem;
    line-height: 1.7;
  }
  .dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(320px, 1fr);
    gap: 16px;
    align-items: start;
  }
  .main-column,
  .detail-column {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .detail-column {
    position: sticky;
    top: 64px;
  }
  .meta-surface {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .meta-row {
    align-items: center;
    justify-content: space-between;
  }
  .meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 11px;
    border-radius: 999px;
    border: 1px solid rgba(46, 46, 52, 1);
    background: rgba(17, 17, 19, 0.76);
    color: ${T.textPrimary};
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.2;
  }
  .legend-row {
    color: ${T.textSecondary};
    font-size: 0.82rem;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .surface-caption {
    color: ${T.textDim};
    font-size: 0.8rem;
    font-weight: 600;
  }
  .loading-shell {
    max-width: 1480px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  .loading-panel {
    height: 140px;
    border-radius: 20px;
    border: 1px solid rgba(46, 46, 52, 1);
    background:
      linear-gradient(110deg, rgba(28, 28, 32, 0.94) 8%, rgba(40, 40, 45, 0.98) 18%, rgba(28, 28, 32, 0.94) 33%),
      linear-gradient(145deg, rgba(28, 28, 32, 0.94), rgba(24, 24, 28, 0.88));
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }
  @keyframes shimmer {
    to { background-position-x: -200%; }
  }
  .dash-card {
    transition:
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
      border-color 220ms ease,
      box-shadow 220ms ease,
      opacity 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @media (hover: hover) {
    .dash-card:hover {
      transform: translateY(-3px);
      border-color: var(--card-border-emphasis) !important;
      box-shadow: 0 10px 24px rgba(0,0,0,0.28), 0 0 10px ${T.accentGlow};
    }
  }
  .event-stage {
    opacity: 1;
    transform: translateY(0);
    filter: none;
    will-change: opacity, transform, filter;
    transition:
      opacity 440ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 440ms cubic-bezier(0.22, 1, 0.36, 1),
      filter 440ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .event-stage.is-pending {
    opacity: 0.5;
    transform: translateY(10px) scale(0.985);
    filter: blur(1px) saturate(0.9);
  }
  button:focus-visible,
  select:focus-visible,
  [role="button"]:focus-visible {
    outline: 2px solid ${T.accent};
    outline-offset: 2px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (max-width: 1120px) {
    .dashboard-hero,
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
    .detail-column {
      position: static;
    }
  }
  @media (max-width: 760px) {
    .app-shell,
    .loading-shell {
      padding: 20px 14px 44px;
    }
    .hero-copy,
    .hero-panel,
    .control-surface,
    .meta-surface {
      padding: 16px;
    }
    .tab-strip {
      width: 100%;
    }
    .hero-stat-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
