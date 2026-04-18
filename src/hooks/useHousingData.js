import { useEffect, useState } from "react";
import { csvParse } from "d3";
import {
  monthEndDateFromString,
  monthIndexFromDateString,
} from "../utils/housingProcessing";
import {
  LA_CLUSTER_BY_ID,
  LA_NEIGHBORHOODS_BY_NAME,
} from "../utils/laNeighborhoods";

const BASE = import.meta.env.BASE_URL + "data/";

async function fetchText(file) {
  const response = await fetch(BASE + file);
  if (!response.ok) {
    throw new Error(`Failed to load ${file}`);
  }
  return response.text();
}

async function fetchJson(file) {
  const response = await fetch(BASE + file);
  if (!response.ok) {
    throw new Error(`Failed to load ${file}`);
  }
  return response.json();
}

async function loadRateSeries(file) {
  const text = await fetchText(file);
  return csvParse(text, (row) => {
    const date = new Date(row.date);
    const key = Object.keys(row).find((column) => column !== "date");
    const raw = row[key];
    if (!raw || raw === ".") return null;
    const value = Number(raw);
    if (Number.isNaN(value)) return null;
    return { date, value };
  }).filter(Boolean);
}

async function loadFomcEvents() {
  const text = await fetchText("fomc_events.csv");
  return csvParse(text, (row) => ({
    date: new Date(row.date),
    dateStr: row.date,
    rateBefore: Number(row.rate_before),
    rateAfter: Number(row.rate_after),
    changePct: Number(row.change_pct),
    direction: row.direction,
  }));
}

async function loadNeighborhoodHpi() {
  const texts = await Promise.all([
    fetchText("la_neighborhood_zhvi.csv"),
    fetchText("la_additional_places_zhvi.csv"),
  ]);
  const rows = texts.flatMap((text) =>
    csvParse(text, (row) => {
      const meta = LA_NEIGHBORHOODS_BY_NAME[row.neighborhood];
      const value = Number(row.value);
      if (!meta || !row.month || !Number.isFinite(value)) return null;

      return {
        stateCode: meta.id,
        date: monthEndDateFromString(row.month),
        monthIndex: monthIndexFromDateString(row.month),
        value,
      };
    }).filter(Boolean)
  );

  const seriesMap = {};
  for (const row of rows) {
    if (!seriesMap[row.stateCode]) {
      seriesMap[row.stateCode] = [];
    }
    seriesMap[row.stateCode].push(row);
  }

  Object.values(seriesMap).forEach((series) => {
    series.sort((left, right) => left.monthIndex - right.monthIndex);
  });

  return seriesMap;
}

async function loadNeighborhoodFeatures() {
  const [laGeojson, adjacentGeojson] = await Promise.all([
    fetchJson("la_times_neighborhoods.geojson"),
    fetchJson("la_adjacent_cities.geojson"),
  ]);

  return [...(laGeojson.features || []), ...(adjacentGeojson.features || [])]
    .map((feature) => {
      const meta = LA_NEIGHBORHOODS_BY_NAME[feature?.properties?.name];
      if (!meta) return null;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          code: meta.id,
          name: meta.name,
          shortLabel: meta.shortLabel,
          clusterId: meta.clusterId,
          clusterLabel: LA_CLUSTER_BY_ID[meta.clusterId]?.label || "Central Los Angeles",
          clusterColor: LA_CLUSTER_BY_ID[meta.clusterId]?.color || null,
        },
      };
    })
    .filter(Boolean);
}

export function useHousingData(enabled = true) {
  const [fomcEvents, setFomcEvents] = useState(null);
  const [mortgageRates, setMortgageRates] = useState(null);
  const [stateHpi, setStateHpi] = useState(null);
  const [stateFeatures, setStateFeatures] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [events, mortgageSeries, neighborhoodSeries, neighborhoodFeatures] =
          await Promise.all([
          loadFomcEvents(),
          loadRateSeries("fred_MORTGAGE30US.csv"),
          loadNeighborhoodHpi(),
          loadNeighborhoodFeatures(),
        ]);

        if (cancelled) return;

        setFomcEvents(events);
        setMortgageRates(mortgageSeries);
        setStateHpi(neighborhoodSeries);
        setStateFeatures(neighborhoodFeatures);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    fomcEvents,
    mortgageRates,
    stateHpi,
    stateFeatures,
    loading,
    error,
  };
}
