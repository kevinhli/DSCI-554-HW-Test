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
  MAP_METRIC_OPTIONS,
  buildClusterIndexedSeries,
  buildHorizonResponseMatrix,
  buildIndexedMonthSeries,
  buildMedianIndexedSeries,
  computeInterpolatedHousingResponses,
  computeMortgageResponse,
  computeStateHousingResponses,
  formatBasisPoints,
  getEligibleEvents,
  getLatestMonthIndex,
  summarizeResponses,
} from "./utils/housingProcessing";
import { T } from "./utils/theme";
import NavBar from "./components/NavBar";
import HousingTransmissionBeat from "./components/HousingTransmissionBeat";
import MortgageReactionChart from "./components/MortgageReactionChart";
import HousingPaceShiftView from "./components/HousingPaceShiftView";
import HousingSpreadView from "./components/HousingSpreadView";
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
  const [primaryView, setPrimaryView] = useState("map");
  const [mapMetric, setMapMetric] = useState("absolute");
  const [mapPlaybackDay, setMapPlaybackDay] = useState(0);
  const [isMapPlaying, setIsMapPlaying] = useState(false);
  const horizonMonths = 12;
  const displayedPrimaryView = useDeferredValue(primaryView);
  const displayedMapMetric = useDeferredValue(mapMetric);

  useEffect(() => {
    const onHashChange = () => setView(getHashView());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!isMapPlaying) return;
    if (mapPlaybackDay >= 90) return;
    const timer = window.setTimeout(() => {
      setMapPlaybackDay((current) => {
        const next = Math.min(90, current + 1);
        if (next >= 90) {
          setIsMapPlaying(false);
        }
        return next;
      });
    }, 38);
    return () => window.clearTimeout(timer);
  }, [isMapPlaying, mapPlaybackDay]);

  const navigate = useCallback((target) => {
    window.location.hash = target === "dashboard" ? "" : target;
    setView(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleMapPlayback = useCallback(() => {
    if (mapPlaybackDay >= 90) {
      setMapPlaybackDay(0);
      setIsMapPlaying(true);
      return;
    }
    setIsMapPlaying((current) => !current);
  }, [mapPlaybackDay]);

  const latestMonthIndex = useMemo(
    () => getLatestMonthIndex(stateHpi),
    [stateHpi]
  );

  const eligibleEvents = useMemo(
    () => getEligibleEvents(fomcEvents || [], latestMonthIndex, horizonMonths),
    [fomcEvents, latestMonthIndex]
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
    () => computeStateHousingResponses(selectedEvent, stateHpi, horizonMonths),
    [selectedEvent, stateHpi]
  );
  const effectiveMapPlaybackDay = mapPlaybackDay === 0 ? 1 : mapPlaybackDay;
  const mapResponses = useMemo(
    () => computeInterpolatedHousingResponses(selectedEvent, stateHpi, effectiveMapPlaybackDay),
    [effectiveMapPlaybackDay, selectedEvent, stateHpi]
  );

  const housingSummary = useMemo(
    () => summarizeResponses(housingResponses),
    [housingResponses]
  );
  const mapSummary = useMemo(() => summarizeResponses(mapResponses), [mapResponses]);

  const mortgageResponse = useMemo(
    () =>
      selectedEvent && mortgageRates
        ? computeMortgageResponse(mortgageRates, selectedEvent.date)
        : null,
    [mortgageRates, selectedEvent]
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
  const horizonMatrix = useMemo(
    () => buildHorizonResponseMatrix(selectedEvent, stateHpi, resolvedSelectedStateCode),
    [resolvedSelectedStateCode, selectedEvent, stateHpi]
  );
  const clusterSeries = useMemo(
    () => (selectedEvent ? buildClusterIndexedSeries(stateHpi, selectedEvent.date) : []),
    [selectedEvent, stateHpi]
  );
  const neighborhoodOptions = useMemo(
    () =>
      [...housingResponses].sort((left, right) => left.stateName.localeCompare(right.stateName)),
    [housingResponses]
  );

  const horizonLabel = "1 year later";
  const mapPlaybackLabel = `Day ${mapPlaybackDay}`;
  const isSwitching =
    isPending ||
    renderedSelectedDate !== resolvedSelectedDate ||
    displayedPrimaryView !== primaryView ||
    displayedMapMetric !== mapMetric;
  const stageDelayStyle = (delay) => ({
    transitionDelay: `${delay}ms`,
  });
  const resetMapPlayback = useCallback(() => {
    setMapPlaybackDay(0);
    setIsMapPlaying(false);
  }, []);

  const stepEvent = useCallback(
    (delta) => {
      if (!eligibleEvents.length || !selectedEvent) return;
      const currentIndex = eligibleEvents.findIndex((event) => event.dateStr === selectedEvent.dateStr);
      const nextIndex = (currentIndex + delta + eligibleEvents.length) % eligibleEvents.length;
      startTransition(() => {
        resetMapPlayback();
        setSelectedDate(eligibleEvents[nextIndex].dateStr);
      });
    },
    [eligibleEvents, resetMapPlayback, selectedEvent, startTransition]
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
                How each Fed move showed up in mortgage rates and LA neighborhood prices.
              </p>
            </div>
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
                  resetMapPlayback();
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
              <span className="control-label">Explore</span>
              <div
                className="tab-strip"
                role="tablist"
                aria-label="Housing views"
                style={styles.viewTabStrip}
              >
                {[ 
                  { id: "map", label: "Map" },
                  { id: "spread", label: "Spread" },
                  { id: "pace", label: "Before/after" },
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
                        setIsMapPlaying(false);
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
              <span className="control-label">Find a neighborhood</span>
              <select
                value={resolvedSelectedStateCode || ""}
                onChange={(event) => setSelectedStateCode(event.target.value || null)}
                style={styles.inlineSelect}
                aria-label="Select a neighborhood"
              >
                {neighborhoodOptions.map((option) => (
                  <option key={option.stateCode} value={option.stateCode}>
                    {option.stateName}
                  </option>
                ))}
              </select>
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
            ) : primaryView === "spread" ? (
              <div className="control-cluster" style={styles.toolbarCard}>
                <span className="control-label">What this view does</span>
                <div style={styles.inlineExplain}>
                  Shows where neighborhoods landed. Your selected neighborhood stays bright.
                </div>
              </div>
            ) : (
              <div className="control-cluster" style={styles.toolbarCard}>
                <span className="control-label">What this view does</span>
                <div style={styles.inlineExplain}>
                  Compares growth before the meeting with growth later on.
                </div>
              </div>
            )}

          </div>
        </section>

        <div
          className={`event-stage${isSwitching ? " is-pending" : ""}`}
          style={stageDelayStyle(24)}
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
                  responses={mapResponses}
                  summary={mapSummary}
                  metricMode={displayedMapMetric}
                  animationKey={selectedEvent?.dateStr || ""}
                  selectedStateCode={resolvedSelectedStateCode}
                  onSelectState={handleSelectState}
                  clusterSeries={clusterSeries}
                  selectedNeighborhoodSeries={selectedStateSeries}
                  playbackDay={mapPlaybackDay}
                  effectivePlaybackDay={effectiveMapPlaybackDay}
                  playbackLabel={mapPlaybackLabel}
                  isPlaying={isMapPlaying}
                  onPlaybackChange={(day) => {
                    setIsMapPlaying(false);
                    setMapPlaybackDay(day);
                  }}
                  onTogglePlayback={toggleMapPlayback}
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
              style={stageDelayStyle(110)}
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
              style={stageDelayStyle(160)}
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
              style={stageDelayStyle(210)}
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
    padding: "12px 16px 10px",
    marginBottom: 8,
  },
  heroRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 12,
  },
  heroCopyBlock: {
    flex: "0 1 840px",
    minWidth: 0,
    textAlign: "center",
  },
  heroTitle: {
    margin: "2px 0 0",
  },
  heroSubtitle: {
    maxWidth: 620,
    margin: "0 auto",
  },
  controlSurface: {
    padding: 12,
    marginBottom: 10,
  },
  toolbarRow: {
    marginTop: 8,
    alignItems: "stretch",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.95fr)",
  },
  toolbarCard: {
    minHeight: 82,
    padding: "11px 12px",
    borderRadius: 16,
    border: `1px solid ${T.cardBorder}`,
    background: "rgba(255,255,255,0.025)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    justifyContent: "flex-start",
  },
  viewTabStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 6,
    width: "100%",
    maxWidth: "100%",
  },
  viewTabButton: {
    width: "100%",
    justifyContent: "center",
    minHeight: 54,
    lineHeight: 1.15,
    textAlign: "center",
    whiteSpace: "normal",
  },
  smallAction: {
    minHeight: 36,
    padding: "0 14px",
  },
  filterButton: {
    minHeight: 36,
    padding: "0 14px",
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
  inlineSelect: {
    width: "100%",
    minHeight: 42,
    background: T.cascadeBg,
    color: T.textPrimary,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 12,
    padding: "0 12px",
    fontSize: 12,
    fontFamily:
      '"Segoe UI Variable Text", "Aptos", "Inter", "Segoe UI", sans-serif',
    outline: "none",
  },
  inlineExplain: {
    color: T.textSecondary,
    fontSize: 11.5,
    lineHeight: 1.45,
    minHeight: 42,
    display: "flex",
    alignItems: "center",
  },
};
