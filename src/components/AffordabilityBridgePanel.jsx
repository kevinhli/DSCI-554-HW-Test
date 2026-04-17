import { useMemo, useState } from "react";
import { max, scaleLinear } from "d3";
import { T } from "../utils/theme";
import {
  computeAffordabilityShift,
  formatCurrency,
  formatPercent,
} from "../utils/housingProcessing";

const OPTIONS = [500000, 750000, 1000000];
const VB_W = 420;
const VB_H = 176;
const MARGIN = { top: 28, right: 18, bottom: 34, left: 18 };
const INNER_W = VB_W - MARGIN.left - MARGIN.right;
const BAR_W = 84;

export default function AffordabilityBridgePanel({
  mortgageResponse,
  housingSummary,
}) {
  const [budget, setBudget] = useState(750000);

  const affordability = useMemo(
    () => computeAffordabilityShift(mortgageResponse, housingSummary, budget),
    [budget, housingSummary, mortgageResponse]
  );

  if (!affordability) return null;

  const values = [
    affordability.baselineBudget,
    affordability.samePaymentBudget,
    affordability.priceAdjustedTarget,
  ];
  const maxValue = max(values) || budget;
  const y = scaleLinear().domain([0, maxValue]).range([0, 90]);
  const columns = [
    {
      label: "Before",
      value: affordability.baselineBudget,
      color: T.textSecondary,
    },
    {
      label: "Same payment",
      value: affordability.samePaymentBudget,
      color: T.accent,
    },
    {
      label: "After prices",
      value: affordability.priceAdjustedTarget,
      color: T.positive,
    },
  ];

  return (
    <section className="dashboard-surface dash-card" style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>What this means for a buyer</div>
          <div style={styles.copy}>
            A quick Los Angeles affordability example using a representative financed budget.
          </div>
        </div>
      </div>

      <div style={styles.selectorRow}>
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={budget === option ? "primary-button" : "ghost-button"}
            style={styles.selectorButton}
            onClick={() => setBudget(option)}
          >
            {formatCurrency(option)}
          </button>
        ))}
      </div>

      <div style={styles.summary}>
        Same payment buying power falls to {formatCurrency(affordability.samePaymentBudget)},
        while a typical LA neighborhood path points to {formatCurrency(affordability.priceAdjustedTarget)}.
      </div>

      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", display: "block" }}>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {columns.map((column, index) => {
            const height = y(column.value);
            const x = index * ((INNER_W - BAR_W) / 2);
            const barY = 92 - height;

            return (
              <g key={column.label} transform={`translate(${x},0)`}>
                <rect
                  x={0}
                  y={barY}
                  width={BAR_W}
                  height={height}
                  rx={14}
                  fill={column.color}
                  opacity={column.label === "Before" ? 0.5 : 0.9}
                  style={styles.barMotion}
                />
                <text
                  x={BAR_W / 2}
                  y={barY - 10}
                  textAnchor="middle"
                  fill={T.textPrimary}
                  fontSize="11"
                  fontWeight="700"
                >
                  {formatCurrency(column.value)}
                </text>
                <text
                  x={BAR_W / 2}
                  y={112}
                  textAnchor="middle"
                  fill={T.textSecondary}
                  fontSize="10"
                >
                  {column.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div style={styles.statGrid}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Monthly payment change</span>
          <strong style={styles.statValue}>{formatCurrency(affordability.paymentChange)}</strong>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Buying power shift</span>
          <strong style={styles.statValue}>
            {formatPercent(affordability.borrowingPowerChangePct)}
          </strong>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Affordability gap</span>
          <strong style={styles.statValue}>{formatCurrency(affordability.budgetGap)}</strong>
        </div>
      </div>
    </section>
  );
}

const styles = {
  card: {
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    marginBottom: 4,
  },
  copy: {
    color: T.textSecondary,
    fontSize: 11.5,
    lineHeight: 1.4,
  },
  selectorRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  selectorButton: {
    minHeight: 34,
    padding: "0 12px",
  },
  summary: {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
    color: T.textPrimary,
    fontSize: 11.5,
    lineHeight: 1.45,
    marginBottom: 10,
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    marginTop: 4,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "8px 10px",
    borderRadius: 11,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.03)",
  },
  statLabel: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  statValue: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  barMotion: {
    transition: "y 420ms ease, height 420ms ease, fill 420ms ease, opacity 420ms ease",
  },
};
