import {
  Suspense,
  lazy,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useHousingData } from "./hooks/useHousingData";
import {
  HORIZON_OPTIONS,
  MAP_METRIC_OPTIONS,
  buildAnalogForecast,
  buildClusterIndexedSeries,
  buildEventResponseCatalog,
  buildHorizonResponseMatrix,
  buildIndexedMonthSeries,
  buildLagSummarySeries,
  buildMedianIndexedSeries,
  computeMortgageResponse,
  computeStateHousingResponses,
  formatBasisPoints,
  formatPercent,
  formatShare,
  getEligibleEvents,
  getLatestMonthIndex,
  summarizeResponses,
} from "./utils/housingProcessing";
import { T } from "./utils/theme";
import NavBar from "./components/NavBar";
import HousingTransmissionBeat from "./components/HousingTransmissionBeat";
import MortgageReactionChart from "./components/MortgageReactionChart";
import HousingPaceShiftView from "./components/HousingPaceShiftView";
import HousingLagView from "./components/HousingLagView";
import HousingSpreadView from "./components/HousingSpreadView";
import CoolingSignalPanel from "./components/CoolingSignalPanel";
import AffordabilityBridgePanel from "./components/AffordabilityBridgePanel";
import HousingStoryPanel from "./components/HousingStoryPanel";
import HousingStateDetail from "./components/HousingStateDetail";
import HousingRankingPanel from "./components/HousingRankingPanel";
import NeighborhoodHexMap from "./components/NeighborhoodHexMap";

const MethodsPage = lazy(() => import("./pages/MethodsPage"));
const DEFAULT_PRESENTATION_EVENT = "2022-06-15";

function getHashView() {
  const hash = window.location.hash.replace("#", "");
  return hash === "methods" ? "methods" : "dashboard";
}

function LoadingState({ onNavigate, view }) {
  return (
    <>
      <NavBar view={view} onNavigate={onNavigate} />
      <div className="loading-shell">
        <div className="loading-panel" style={{ height: 110, marginBottom: 18 }} />
        <div className="loading-panel" style={{ height: 124, marginBottom: 18 }} />
        <div className="loading-panel" style={{ height: 170, marginBottom: 18 }} />
        <div className="loading-panel" style={{ height: 520 }} />
      </div>
    </>
  );
}

function PageFallback() {
  return (
    <div className="app-shell">
      <div className="loading-panel" style={{ height: 220 }} />
    </div>
  );
}

function formatDirectionLabel(event) {
  if (!event) return "No event selected";
  if (event.direction === "hold") return "Fed held steady";
  return `Fed ${event.direction} ${formatBasisPoints(event.changePct)}`;
}

export default function App() {
  const [view, setView] = useState(getHashView);
  const [isPending, startTransition] = useTransition();
  const {
    fomcEvents,
    mortgageRates,
    stateHpi,
    stateFeatures,
    loading,
    error,
  } = useHousingData(view !== "methods");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStateCode, setSelectedStateCode] = useState(null);
  const [horizonQuarters, setHorizonQuarters] = useState(4);
  const [primaryView, setPrimaryView] = useState("map");
  const [mapMetric, setMapMetric] = useState("absolute");
  const displayedHorizonQuarters = useDeferredValue(horizonQuarters);
  const displayedPrimaryView = useDeferredValue(primaryView);
  const displayedMapMetric = useDeferredValue(mapMetric);

  useEffect(() => {
    const onHashChange = () => setView(getHashView());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((target) => {
    window.location.hash = target === "dashboard" ? "" : target;
    setView(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const latestMonthIndex = useMemo(
    () => getLatestMonthIndex(stateHpi),
    [stateHpi]
  );

  const eligibleEvents = useMemo(
    () => getEligibleEvents(fomcEvents || [], latestMonthIndex, horizonQuarters),
    [fomcEvents, horizonQuarters, latestMonthIndex]
  );

  const resolvedSelectedDate = useMemo(() => {
    if (!eligibleEvents.length) return null;
    const exists = eligibleEvents.some((event) => event.dateStr === selectedDate);
    if (exists) return selectedDate;

    const presentationDefault = eligibleEvents.find(
      (event) => event.dateStr === DEFAULT_PRESENTATION_EVENT
    );
    return presentationDefault?.dateStr || eligibleEvents[eligibleEvents.length - 1].dateStr;
  }, [eligibleEvents, selectedDate]);
  const displayedSelectedDate = useDeferredValue(resolvedSelectedDate);

  const renderedSelectedDate = displayedSelectedDate || resolvedSelectedDate;

  const selectedEvent = useMemo(
    () =>
      eligibleEvents.find((event) => event.dateStr === renderedSelectedDate) ||
      eligibleEvents.find((event) => event.dateStr === resolvedSelectedDate) ||
      null,
    [eligibleEvents, renderedSelectedDate, resolvedSelectedDate]
  );

  const housingResponses = useMemo(
    () => computeStateHousingResponses(selectedEvent, stateHpi, displayedHorizonQuarters),
    [displayedHorizonQuarters, selectedEvent, stateHpi]
  );

  const housingSummary = useMemo(
    () => summarizeResponses(housingResponses),
    [housingResponses]
  );

  const mortgageResponse = useMemo(
    () =>
      selectedEvent && mortgageRates
        ? computeMortgageResponse(mortgageRates, selectedEvent.date)
        : null,
    [mortgageRates, selectedEvent]
  );

  const eventCatalog = useMemo(
    () =>
      buildEventResponseCatalog(
        eligibleEvents,
        mortgageRates,
        stateHpi,
        displayedHorizonQuarters
      ),
    [eligibleEvents, displayedHorizonQuarters, mortgageRates, stateHpi]
  );

  const housingForecast = useMemo(
    () => buildAnalogForecast(selectedEvent, mortgageResponse, eventCatalog),
    [eventCatalog, mortgageResponse, selectedEvent]
  );

  const resolvedSelectedStateCode = useMemo(() => {
    if (!housingResponses.length) return null;
    const stateStillVisible = housingResponses.some(
      (response) => response.stateCode === selectedStateCode
    );

    if (stateStillVisible) return selectedStateCode;
    return (
      housingSummary?.sharpestCooler?.stateCode ||
      housingSummary?.coolestRelative?.stateCode ||
      housingResponses[0].stateCode
    );
  }, [housingResponses, housingSummary, selectedStateCode]);

  const selectedStateResponse = useMemo(
    () =>
      housingResponses.find((response) => response.stateCode === resolvedSelectedStateCode) ||
      null,
    [housingResponses, resolvedSelectedStateCode]
  );

  const selectedStateSeries = useMemo(
    () =>
      resolvedSelectedStateCode && selectedEvent
        ? buildIndexedMonthSeries(stateHpi?.[resolvedSelectedStateCode], selectedEvent.date)
        : [],
    [resolvedSelectedStateCode, selectedEvent, stateHpi]
  );

  const benchmarkSeries = useMemo(
    () => (selectedEvent ? buildMedianIndexedSeries(stateHpi, selectedEvent.date) : []),
    [selectedEvent, stateHpi]
  );
  const lagSeries = useMemo(
    () => buildLagSummarySeries(selectedEvent, stateHpi, resolvedSelectedStateCode),
    [resolvedSelectedStateCode, selectedEvent, stateHpi]
  );
  const horizonMatrix = useMemo(
    () => buildHorizonResponseMatrix(selectedEvent, stateHpi, resolvedSelectedStateCode),
    [resolvedSelectedStateCode, selectedEvent, stateHpi]
  );
  const clusterSeries = useMemo(
    () => (selectedEvent ? buildClusterIndexedSeries(stateHpi, selectedEvent.date) : []),
    [selectedEvent, stateHpi]
  );

  const horizonLabel =
    HORIZON_OPTIONS.find((option) => option.id === displayedHorizonQuarters)?.description ||
    "1 year after";
  const coolingShareLabel =
    housingSummary?.coolingShare == null
      ? "N/A"
      : formatShare(housingSummary.coolingShare);
  const mortgageChipLabel =
    mortgageResponse?.change == null
      ? "Mortgage rates: pending"
      : `Mortgage rates: ${mortgageResponse.changeLabel}`;
  const isSwitching =
    isPending ||
    renderedSelectedDate !== resolvedSelectedDate ||
    displayedHorizonQuarters !== horizonQuarters ||
    displayedPrimaryView !== primaryView ||
    displayedMapMetric !== mapMetric;
  const stageDelayStyle = (delay) => ({
    transitionDelay: `${delay}ms`,
  });

  const stepEvent = useCallback(
    (delta) => {
      if (!eligibleEvents.length || !selectedEvent) return;
      const currentIndex = eligibleEvents.findIndex((event) => event.dateStr === selectedEvent.dateStr);
      const nextIndex = (currentIndex + delta + eligibleEvents.length) % eligibleEvents.length;
      startTransition(() => {
        setSelectedDate(eligibleEvents[nextIndex].dateStr);
      });
    },
    [eligibleEvents, selectedEvent, startTransition]
  );

  const handleSelectState = useCallback((stateCode) => {
    setSelectedStateCode(stateCode);
    if (window.matchMedia("(max-width: 1120px)").matches) {
      requestAnimationFrame(() => {
        document.getElementById("state-detail")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, []);

  if (loading) {
    return <LoadingState onNavigate={navigate} view={view} />;
  }

  if (error) {
    return (
      <>
        <NavBar view={view} onNavigate={navigate} />
        <div className="app-shell">
          <div
            className="dashboard-surface"
            style={{
              padding: 24,
              borderLeft: `3px solid ${T.hike}`,
            }}
          >
            <span className="section-kicker">Error</span>
            <h1 className="section-title">The housing dashboard could not load its data.</h1>
            <p className="section-copy" style={{ marginTop: 10 }}>
              {error}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (view === "methods") {
    return (
      <>
        <NavBar view={view} onNavigate={navigate} />
        <Suspense fallback={<PageFallback />}>
          <MethodsPage />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <NavBar view={view} onNavigate={navigate} />

      <div className="app-shell container-fluid px-0">
        <section
          className={`dashboard-surface event-stage${isSwitching ? " is-pending" : ""}`}
          style={styles.heroSurface}
        >
          <div style={styles.heroRow}>
            <div style={styles.heroCopyBlock}>
              <span className="eyebrow">Fed, mortgages, and Los Angeles neighborhoods</span>
              <h1 className="hero-title" style={styles.heroTitle}>
                Fed to Front Door: Los Angeles
              </h1>
              <p className="hero-subtitle" style={styles.heroSubtitle}>
                See how each Fed move filtered into mortgage rates and then into Los Angeles
                neighborhood prices, from the Valley to the harbor.
              </p>
            </div>
          </div>

          <div className="hero-chip-row" style={{ marginTop: 14 }}>
            <span className="meta-chip">{selectedEvent?.dateStr || "No event"}</span>
            <span className="meta-chip">{formatDirectionLabel(selectedEvent)}</span>
            <span className="meta-chip">{mortgageChipLabel}</span>
            <span className="meta-chip">
              LA neighborhoods: {formatPercent(housingSummary?.medianChange)} typical
            </span>
            <span className="meta-chip">
              Neighborhoods cooling: {coolingShareLabel}
            </span>
          </div>
        </section>

        <section className="dashboard-surface control-surface" style={styles.controlSurface}>
          <div className="stepper-row">
            <button
              type="button"
              className="secondary-button"
              style={styles.smallAction}
              onClick={() => stepEvent(-1)}
            >
              Previous
            </button>

            <select
              value={resolvedSelectedDate || ""}
              onChange={(event) =>
                startTransition(() => {
                  setSelectedDate(event.target.value);
                })
              }
              style={styles.stepSelect}
              aria-label="Select an FOMC event"
            >
              {eligibleEvents.map((event) => (
                <option key={event.dateStr} value={event.dateStr}>
                  {event.dateStr} | {event.direction.toUpperCase()} | {formatBasisPoints(event.changePct)}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="secondary-button"
              style={styles.smallAction}
              onClick={() => stepEvent(1)}
            >
              Next
            </button>
          </div>

          <div className="control-grid" style={styles.toolbarRow}>
            <div className="control-cluster" style={styles.toolbarCard}>
              <span className="control-label">View</span>
              <div
                className="tab-strip"
                role="tablist"
                aria-label="Housing views"
                style={styles.viewTabStrip}
              >
                {[
                  { id: "map", label: "Neighborhood map" },
                  { id: "lag", label: "Reaction timing" },
                  { id: "spread", label: "Neighborhood spread" },
                  { id: "pace", label: "Before vs after" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={primaryView === option.id}
                    className={primaryView === option.id ? "tab-button active" : "tab-button"}
                    style={styles.viewTabButton}
                    onClick={() =>
                      startTransition(() => {
                        setPrimaryView(option.id);
                      })
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-cluster" style={styles.toolbarCard}>
                <span className="control-label">Neighborhood horizon</span>
                <div className="control-row">
                  {HORIZON_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={horizonQuarters === option.id ? "primary-button" : "ghost-button"}
                    style={styles.filterButton}
                    onClick={() =>
                      startTransition(() => {
                        setHorizonQuarters(option.id);
                      })
                    }
                    aria-pressed={horizonQuarters === option.id}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {primaryView === "map" ? (
              <div className="control-cluster" style={styles.toolbarCard}>
                <span className="control-label">Map shows</span>
                <div className="control-row">
                  {MAP_METRIC_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={mapMetric === option.id ? "primary-button" : "ghost-button"}
                      style={styles.filterButton}
                      onClick={() =>
                        startTransition(() => {
                          setMapMetric(option.id);
                        })
                      }
                      aria-pressed={mapMetric === option.id}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : primaryView === "pace" ? (
              <div className="control-cluster" style={styles.toolbarCard}>
                <span className="control-label">How to read it</span>
                <div style={styles.inlineExplain}>
                  Each line starts with a neighborhood's pace before the meeting and ends
                  with its pace after it. Downward means cooling.
                </div>
              </div>
            ) : primaryView === "spread" ? (
              <div className="control-cluster" style={styles.toolbarCard}>
                <span className="control-label">How to read it</span>
                <div style={styles.inlineExplain}>
                  Each dot is a neighborhood. The center band shows the middle half of LA,
                  and the bright line keeps the selected neighborhood visible.
                </div>
              </div>
            ) : (
              <div className="control-cluster" style={styles.toolbarCard}>
                <span className="control-label">How to read it</span>
                <div style={styles.inlineExplain}>
                  The pulse rises where the effect is strongest. Bigger circles mean the
                  slowdown spread across more neighborhoods.
                </div>
              </div>
            )}

          </div>

          <div style={styles.hint}>
            {primaryView === "map"
              ? "The map uses real Los Angeles neighborhood boundaries. Color shows the selected housing effect, and the small columns show which neighborhoods were already more expensive at the meeting."
              : primaryView === "lag"
              ? "Use this to explain timing: mortgage rates usually react in weeks, while neighborhood price shifts show up over the next few months."
              : primaryView === "spread"
              ? "Use this to explain dispersion: some neighborhoods keep running hot, while others cool earlier, and the selected one stays highlighted."
              : "This compares the same number of months before and after the meeting so the pace shift is easy to understand."}
          </div>
        </section>

        <div
          className={`event-stage${isSwitching ? " is-pending" : ""}`}
          style={stageDelayStyle(0)}
        >
          <HousingTransmissionBeat
            event={selectedEvent}
            mortgageResponse={mortgageResponse}
            housingSummary={housingSummary}
            horizonLabel={horizonLabel}
          />
        </div>

        <div className="dashboard-grid">
          <div className="main-column">
            <div
              className={`event-stage${isSwitching ? " is-pending" : ""}`}
              style={stageDelayStyle(40)}
            >
              {displayedPrimaryView === "map" ? (
                <NeighborhoodHexMap
                  features={stateFeatures}
                  responses={housingResponses}
                  summary={housingSummary}
                  metricMode={displayedMapMetric}
                  animationKey={selectedEvent?.dateStr || ""}
                  selectedStateCode={resolvedSelectedStateCode}
                  onSelectState={handleSelectState}
                  horizonLabel={horizonLabel}
                  clusterSeries={clusterSeries}
                  selectedNeighborhoodSeries={selectedStateSeries}
                />
              ) : displayedPrimaryView === "lag" ? (
                <HousingLagView
                  event={selectedEvent}
                  mortgageResponse={mortgageResponse}
                  lagSeries={lagSeries}
                  animationKey={selectedEvent?.dateStr || ""}
                />
              ) : displayedPrimaryView === "spread" ? (
                <HousingSpreadView
                  horizonMatrix={horizonMatrix}
                  animationKey={selectedEvent?.dateStr || ""}
                  selectedStateCode={resolvedSelectedStateCode}
                  onSelectState={handleSelectState}
                />
              ) : (
                <HousingPaceShiftView
                  animationKey={selectedEvent?.dateStr || ""}
                  responses={housingResponses}
                  selectedStateCode={resolvedSelectedStateCode}
                  onSelectState={handleSelectState}
                  horizonLabel={horizonLabel}
                />
              )}
            </div>

            <div
              className={`event-stage${isSwitching ? " is-pending" : ""}`}
              style={stageDelayStyle(90)}
            >
              <CoolingSignalPanel
                animationKey={selectedEvent?.dateStr || ""}
                summary={housingSummary}
                forecast={housingForecast}
                mortgageResponse={mortgageResponse}
                horizonLabel={horizonLabel}
              />
            </div>

            <div
              className={`event-stage${isSwitching ? " is-pending" : ""}`}
              style={stageDelayStyle(130)}
            >
              <MortgageReactionChart
                animationKey={selectedEvent?.dateStr || ""}
                mortgageRates={mortgageRates}
                event={selectedEvent}
                response={mortgageResponse}
              />
            </div>
          </div>

          <div className="detail-column" id="state-detail">
            <div
              className={`event-stage${isSwitching ? " is-pending" : ""}`}
              style={stageDelayStyle(60)}
            >
              <AffordabilityBridgePanel
                mortgageResponse={mortgageResponse}
                housingSummary={housingSummary}
              />
            </div>

            <div
              className={`event-stage${isSwitching ? " is-pending" : ""}`}
              style={stageDelayStyle(120)}
            >
              <HousingStoryPanel
                event={selectedEvent}
                mortgageResponse={mortgageResponse}
                summary={housingSummary}
                horizonLabel={horizonLabel}
              />
            </div>

            <div
              className={`event-stage${isSwitching ? " is-pending" : ""}`}
              style={stageDelayStyle(180)}
            >
              <HousingStateDetail
                animationKey={`${selectedEvent?.dateStr || ""}-${resolvedSelectedStateCode || ""}`}
                response={selectedStateResponse}
                stateSeries={selectedStateSeries}
                benchmarkSeries={benchmarkSeries}
                horizonLabel={horizonLabel}
              />
            </div>

            <div
              className={`event-stage${isSwitching ? " is-pending" : ""}`}
              style={stageDelayStyle(230)}
            >
              <HousingRankingPanel
                animationKey={selectedEvent?.dateStr || ""}
                responses={housingResponses}
                horizonLabel={horizonLabel}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  heroSurface: {
    padding: 20,
    marginBottom: 18,
  },
  heroRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  heroCopyBlock: {
    flex: "1 1 540px",
    minWidth: 0,
  },
  heroActionBlock: {
    flex: "0 1 auto",
    display: "flex",
    justifyContent: "flex-end",
  },
  heroTitle: {
    margin: "10px 0 8px",
  },
  heroSubtitle: {
    maxWidth: 640,
    margin: 0,
  },
  controlSurface: {
    padding: 18,
    marginBottom: 18,
  },
  toolbarRow: {
    marginTop: 12,
    alignItems: "flex-start",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  toolbarCard: {
    minHeight: 118,
    padding: "12px 14px",
    borderRadius: 16,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.025)",
    justifyContent: "space-between",
  },
  viewTabStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    width: "100%",
    maxWidth: "100%",
  },
  viewTabButton: {
    width: "100%",
    justifyContent: "center",
    minHeight: 36,
  },
  smallAction: {
    minHeight: 36,
    padding: "0 14px",
  },
  filterButton: {
    minHeight: 34,
    padding: "0 12px",
  },
  stepSelect: {
    flex: "1 1 320px",
    minHeight: 40,
    background: T.cascadeBg,
    color: T.textPrimary,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 999,
    padding: "0 16px",
    fontSize: 12,
    fontFamily:
      '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif',
    outline: "none",
  },
  hint: {
    marginTop: 10,
    color: T.textDim,
    fontSize: 12,
    lineHeight: 1.45,
  },
  inlineExplain: {
    color: T.textSecondary,
    fontSize: 12,
    lineHeight: 1.45,
    paddingTop: 2,
  },
};
