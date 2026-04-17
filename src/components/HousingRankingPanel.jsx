import { max } from "d3";
import { T } from "../utils/theme";
import { formatPercent } from "../utils/housingProcessing";

function RankingList({
  animationKey,
  title,
  items,
  color,
  valueAccessor = (item) => item.changePct,
  scaleMax = 1,
}) {
  return (
    <div style={styles.column}>
      <div style={styles.columnTitle}>{title}</div>
      <div style={styles.list}>
        {items.map((item, index) => {
          const value = valueAccessor(item);
      return (
            <div
              key={`${item.stateCode}-${animationKey || "base"}`}
              style={{
                ...styles.row,
                animation: `chartFadeUp 320ms cubic-bezier(0.22, 1, 0.36, 1) ${
                  80 + index * 50
                }ms both`,
              }}
            >
              <div style={styles.rowHeader}>
                <span style={styles.stateName}>{item.stateName}</span>
                <span style={{ ...styles.value, color }}>{formatPercent(value)}</span>
              </div>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    background: color,
                    width: `${Math.max(8, (Math.abs(value) / scaleMax) * 100)}%`,
                    animation: `chartBarGrow 520ms cubic-bezier(0.22, 1, 0.36, 1) ${
                      110 + index * 50
                    }ms both`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HousingRankingPanel({ responses, horizonLabel, animationKey }) {
  if (!responses?.length) return null;

  const strongestGains = [...responses]
    .sort((left, right) => right.changePct - left.changePct)
    .slice(0, 5);
  const sharpestCooling = [...responses]
    .filter((response) => response.acceleration != null)
    .sort((left, right) => left.acceleration - right.acceleration)
    .slice(0, 5);
  const scaleMax =
    max([
      ...strongestGains.map((item) => Math.abs(item.changePct)),
      ...sharpestCooling.map((item) => Math.abs(item.acceleration ?? 0)),
      1,
    ]) || 1;

  return (
    <section className="dashboard-surface" style={styles.card}>
      <div style={styles.title}>Neighborhood leaderboard</div>
      <div style={styles.copy}>
        One list shows the strongest gains after the meeting. The other shows where
        price growth cooled the most compared with the previous {horizonLabel.toLowerCase()}.
      </div>

      <div style={styles.grid}>
        <RankingList
          animationKey={animationKey}
          title="Strongest gains"
          items={strongestGains}
          color={T.positive}
          scaleMax={scaleMax}
        />
        <RankingList
          animationKey={animationKey}
          title="Sharpest slowdown"
          items={sharpestCooling}
          color={T.negative}
          valueAccessor={(item) => item.acceleration}
          scaleMax={scaleMax}
        />
      </div>
    </section>
  );
}

const styles = {
  card: {
    padding: 18,
  },
  title: {
    color: T.textPrimary,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    marginBottom: 4,
  },
  copy: {
    color: T.textSecondary,
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  columnTitle: {
    color: T.textDim,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  rowHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
  },
  stateName: {
    color: T.textPrimary,
    fontSize: 12,
    fontWeight: 700,
  },
  value: {
    fontSize: 12,
    fontWeight: 700,
  },
  barTrack: {
    height: 7,
    borderRadius: 999,
    background: T.cardBorderLight,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    transformOrigin: "left center",
    transition: "width 440ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
};
