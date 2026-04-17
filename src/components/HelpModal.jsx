import { useEffect, useRef } from "react";
import { T } from "../utils/theme";

const FONT_FAMILY =
  '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif';

const STEPS = [
  {
    number: 1,
    title: "Pick a Fed meeting",
    description:
      "Use the event selector and horizon buttons to choose the policy move and how far out you want to measure housing follow-through.",
  },
  {
    number: 2,
    title: "Read the transmission beat",
    description:
      "The first row tells the story in order: Fed move first, mortgage-rate repricing next, state home-price response after that.",
  },
  {
    number: 3,
    title: "Use the map and state focus",
    description:
      "The map shows how each state moved after the event. Click a state to compare its path with the median state response.",
  },
];

const NOTES = [
  "Mortgage rates are weekly, so they react faster than the home-price data.",
  "State home prices come from FHFA quarterly HPI, so housing reactions appear with a slower lag.",
  "This dashboard is descriptive. It shows timing and co-movement, not proof that the Fed alone caused each state outcome.",
  "For a short demo, the default June 15, 2022 meeting and the 'cooling vs prior pace' map lens usually tell the clearest story.",
];

export default function HelpModal({ onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        style={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          style={styles.closeBtn}
          onClick={onClose}
          aria-label="Close help dialog"
        >
          Close
        </button>

        <h2 id="help-title" style={styles.title}>
          How to Read This Housing Dashboard
        </h2>

        <div style={styles.steps}>
          {STEPS.map((step) => (
            <div key={step.number} style={styles.stepRow}>
              <div style={styles.badge}>{step.number}</div>
              <div style={styles.stepContent}>
                <div style={styles.stepTitle}>{step.title}</div>
                <div style={styles.stepDesc}>{step.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.notes}>
          {NOTES.map((note) => (
            <div key={note} style={styles.note}>
              {note}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.72)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT_FAMILY,
  },
  card: {
    position: "relative",
    background: T.cardBg,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 20,
    padding: 28,
    maxWidth: 620,
    width: "90%",
    boxShadow: "0 28px 60px rgba(0,0,0,0.32)",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    background: T.cardBgActive,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 999,
    minHeight: 34,
    padding: "0 12px",
    fontSize: 12,
    fontWeight: 700,
    color: T.textSecondary,
    cursor: "pointer",
    lineHeight: 1,
  },
  title: {
    color: T.textPrimary,
    fontSize: 20,
    fontWeight: 700,
    marginTop: 0,
    marginBottom: 18,
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  stepRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  badge: {
    minWidth: 30,
    height: 30,
    borderRadius: 8,
    background: `${T.accent}1f`,
    color: T.accent,
    fontSize: 16,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepContent: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  stepTitle: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: 700,
  },
  stepDesc: {
    color: T.textSecondary,
    fontSize: 13,
    lineHeight: 1.6,
  },
  notes: {
    marginTop: 22,
    paddingTop: 16,
    borderTop: `1px solid ${T.cardBorder}`,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  note: {
    color: T.textSecondary,
    fontSize: 12,
    lineHeight: 1.55,
  },
};
