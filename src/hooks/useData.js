import { useState, useEffect } from "react";
import { csvParse } from "d3";
import { ALL_INDICATORS } from "../utils/indicators";

const BASE = import.meta.env.BASE_URL + "data/";

async function loadCsv(file) {
  const res = await fetch(BASE + file);
  if (!res.ok) {
    throw new Error(`Failed to load ${file}`);
  }
  const text = await res.text();
  return csvParse(text, (d) => {
    const date = new Date(d.date);
    const valKey = Object.keys(d).find((k) => k !== "date");
    const raw = d[valKey];
    if (raw === "" || raw === "." || raw === undefined || raw === null) return null;
    const value = +raw;
    return isNaN(value) ? null : { date, value };
  }).filter(Boolean);
}

async function loadFomcEvents() {
  const res = await fetch(BASE + "fomc_events.csv");
  if (!res.ok) {
    throw new Error("Failed to load fomc_events.csv");
  }
  const text = await res.text();
  return csvParse(text, (d) => ({
    date: new Date(d.date),
    dateStr: d.date,
    rateBefore: +d.rate_before,
    rateAfter: +d.rate_after,
    changePct: +d.change_pct,
    direction: d.direction,
  }));
}

export function useData(enabled = true) {
  const [fomcEvents, setFomcEvents] = useState(null);
  const [indicatorData, setIndicatorData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const events = await loadFomcEvents();

        const entries = await Promise.all(
          ALL_INDICATORS.map(async (ind) => {
            try {
              const rows = await loadCsv(ind.file);
              return [ind.key, rows];
            } catch {
              console.warn(`Skipped ${ind.file}`);
              return [ind.key, []];
            }
          })
        );

        const dataMap = Object.fromEntries(entries);
        setFomcEvents(events);
        setIndicatorData(dataMap);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [enabled]);

  return { fomcEvents, indicatorData, loading, error };
}
