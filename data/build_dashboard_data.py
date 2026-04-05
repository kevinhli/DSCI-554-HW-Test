#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests


DATA_DIR = Path(__file__).resolve().parent
ROOT = DATA_DIR.parent
CLEAN_DIR = DATA_DIR / "cleaned data"
EVENTS_PATH = DATA_DIR / "fomc_events.csv"
DASHBOARD_DATA_DIR = ROOT / ".github" / "Monetary_Policy_Dashboard" / "public" / "data"
FRED_OBSERVATIONS_URL = "https://api.stlouisfed.org/fred/series/observations"


@dataclass(frozen=True)
class SeriesConfig:
    id: str
    label: str
    short_label: str
    source: str
    remote_id: str
    layer: str
    lens: str
    frequency: str
    unit: str
    description: str
    example: str
    display_lag_months: int
    order: int


LAYER_META = [
    {
        "id": "policy",
        "label": "Policy Center",
        "ring_label": "Center",
        "description": "The Fed decision itself and the policy tools closest to it.",
    },
    {
        "id": "immediate",
        "label": "Immediate Market Reaction",
        "ring_label": "Inner ring",
        "description": "Markets that tend to reprice first after a Fed decision.",
    },
    {
        "id": "secondary",
        "label": "Credit Transmission",
        "ring_label": "Middle ring",
        "description": "Borrowing costs and rate-sensitive sectors that transmit policy into the economy.",
    },
    {
        "id": "tertiary",
        "label": "Macro Outcomes",
        "ring_label": "Outer ring",
        "description": "Slower-moving labor, housing, and inflation outcomes.",
    },
]


LENS_META = [
    {
        "id": "market-reaction",
        "label": "Immediate Market Reaction",
        "description": "Prioritize yields, broad equity moves, volatility, and global spillovers.",
        "layers": ["policy", "immediate"],
    },
    {
        "id": "credit-transmission",
        "label": "Credit Transmission",
        "description": "Focus on bank lending conditions, mortgage rates, and rate-sensitive sectors.",
        "layers": ["policy", "secondary"],
    },
    {
        "id": "macro-outcomes",
        "label": "Macro Outcomes",
        "description": "Track housing, jobs, and inflation as the downstream ripple arrives.",
        "layers": ["policy", "tertiary"],
    },
    {
        "id": "full-cascade",
        "label": "Full Cascade",
        "description": "View every layer together as one policy ripple.",
        "layers": ["policy", "immediate", "secondary", "tertiary"],
    },
]


SERIES = [
    SeriesConfig("DFF", "Federal Funds Rate", "Fed Funds", "FRED", "DFF", "policy", "full-cascade", "daily", "percent", "The overnight interest rate banks charge each other. This is the policy rate closest to the Fed's decision.", "Example: if the Fed tightens policy, the Fed Funds rate usually rises almost immediately.", 0, 1),
    SeriesConfig("DFEDTARL", "Fed Funds Target Lower", "Target Low", "FRED", "DFEDTARL", "policy", "full-cascade", "daily", "percent", "The lower edge of the Fed's official target range for short-term rates.", "Example: a target range of 5.25% to 5.50% would have 5.25% as the lower bound.", 0, 2),
    SeriesConfig("DFEDTARU", "Fed Funds Target Upper", "Target High", "FRED", "DFEDTARU", "policy", "full-cascade", "daily", "percent", "The upper edge of the Fed's official target range for short-term rates.", "Example: when the Fed raises rates by 25 basis points, this upper bound usually moves up by 0.25%.", 0, 3),
    SeriesConfig("M2SL", "M2 Money Stock", "M2", "FRED", "M2SL", "policy", "full-cascade", "monthly", "billions of dollars", "A broad measure of money in the economy, including cash, checking, and savings balances.", "Example: during aggressive stimulus periods, M2 often expands quickly as money enters the system.", 4, 4),
    SeriesConfig("DGS2", "2-Year Treasury Yield", "2Y Yield", "FRED", "DGS2", "immediate", "market-reaction", "daily", "percent", "The interest rate investors demand to hold a 2-year U.S. Treasury bond.", "Example: if markets expect more Fed hikes, the 2-year yield often jumps within days.", 0, 5),
    SeriesConfig("DGS10", "10-Year Treasury Yield", "10Y Yield", "FRED", "DGS10", "immediate", "market-reaction", "daily", "percent", "The benchmark 10-year government bond yield that influences borrowing costs across the economy.", "Example: mortgage and corporate borrowing costs often move with the 10-year yield.", 0, 6),
    SeriesConfig("DGS30", "30-Year Treasury Yield", "30Y Yield", "FRED", "DGS30", "immediate", "market-reaction", "daily", "percent", "The yield on very long-term U.S. government debt.", "Example: a rise here suggests investors want more compensation to lock money up for decades.", 1, 7),
    SeriesConfig("T10Y2Y", "10Y-2Y Yield Spread", "Yield Spread", "FRED", "T10Y2Y", "immediate", "market-reaction", "daily", "percentage points", "The gap between the 10-year and 2-year Treasury yields, often used to read the shape of the yield curve.", "Example: when the spread turns negative, people often say the yield curve is inverted.", 1, 8),
    SeriesConfig("^GSPC", "S&P 500", "S&P 500", "Yahoo Finance", "^GSPC", "immediate", "market-reaction", "daily", "index points", "A broad stock-market index tracking 500 large U.S. companies.", "Example: a surprise rate hike can push the S&P 500 lower if investors expect slower growth.", 0, 9),
    SeriesConfig("^DJI", "Dow Jones Industrial Average", "Dow Jones", "Yahoo Finance", "^DJI", "immediate", "market-reaction", "daily", "index points", "A stock-market index of 30 major U.S. companies.", "Example: financial news often quotes the Dow when reacting to Fed announcements the same day.", 0, 10),
    SeriesConfig("^VIX", "CBOE Volatility Index", "VIX", "Yahoo Finance", "^VIX", "immediate", "market-reaction", "daily", "index points", "A market fear gauge based on expected stock volatility.", "Example: when investors panic around a surprise decision, the VIX often spikes upward.", 0, 11),
    SeriesConfig("GLD", "SPDR Gold Shares", "Gold ETF", "Yahoo Finance", "GLD", "immediate", "market-reaction", "daily", "price", "An exchange-traded fund that tracks gold prices and acts as a common safe-haven proxy.", "Example: if investors worry about inflation or instability, they may rotate into gold.", 2, 12),
    SeriesConfig("BTC-USD", "Bitcoin", "Bitcoin", "Yahoo Finance", "BTC-USD", "immediate", "market-reaction", "daily", "price", "A crypto asset that sometimes trades like a risk asset and sometimes like an inflation hedge.", "Example: during tightening cycles, Bitcoin has often behaved more like a high-risk tech asset than digital gold.", 2, 13),
    SeriesConfig("VEU", "Vanguard All-World ex-US", "VEU", "Yahoo Finance", "VEU", "immediate", "market-reaction", "daily", "price", "An ETF covering developed stock markets outside the United States.", "Example: a stronger U.S. dollar after Fed tightening can pressure non-U.S. equity returns.", 1, 14),
    SeriesConfig("EEM", "iShares Emerging Markets", "EEM", "Yahoo Finance", "EEM", "immediate", "market-reaction", "daily", "price", "An ETF tracking emerging-market stocks, which are often sensitive to U.S. rate moves.", "Example: if U.S. yields rise, capital can flow out of emerging markets and weigh on EEM.", 1, 15),
    SeriesConfig("BAA", "Baa Corporate Bond Yield", "Baa Yield", "FRED", "BAA", "secondary", "credit-transmission", "monthly", "percent", "A borrowing-cost benchmark for lower investment-grade U.S. companies.", "Example: if this yield rises, companies with weaker credit usually face more expensive financing.", 2, 16),
    SeriesConfig("DPRIME", "Bank Prime Loan Rate", "Prime Rate", "FRED", "DPRIME", "secondary", "credit-transmission", "daily", "percent", "The base rate banks offer to their most creditworthy business customers.", "Example: variable-rate business loans often reset when the prime rate changes.", 1, 17),
    SeriesConfig("MORTGAGE30US", "30-Year Mortgage Rate", "Mortgage Rate", "FRED", "MORTGAGE30US", "secondary", "credit-transmission", "weekly", "percent", "The average rate on a standard 30-year fixed home mortgage.", "Example: when mortgage rates rise from 3% to 7%, monthly home payments become much less affordable.", 3, 18),
    SeriesConfig("XLF", "Financial Select Sector SPDR", "XLF", "Yahoo Finance", "XLF", "secondary", "credit-transmission", "daily", "price", "An ETF representing major U.S. financial firms like banks and insurers.", "Example: banks can benefit when higher rates widen the spread between what they earn and what they pay.", 1, 19),
    SeriesConfig("XLRE", "Real Estate Select Sector SPDR", "XLRE", "Yahoo Finance", "XLRE", "secondary", "credit-transmission", "daily", "price", "An ETF representing real-estate companies and REITs.", "Example: higher financing costs often hurt real-estate valuations and can drag XLRE down.", 5, 20),
    SeriesConfig("XLK", "Technology Select Sector SPDR", "XLK", "Yahoo Finance", "XLK", "secondary", "credit-transmission", "daily", "price", "An ETF representing large U.S. technology companies.", "Example: tech valuations often weaken when discount rates rise because future earnings are worth less today.", 1, 21),
    SeriesConfig("XLE", "Energy Select Sector SPDR", "XLE", "Yahoo Finance", "XLE", "secondary", "credit-transmission", "daily", "price", "An ETF representing oil, gas, and energy companies.", "Example: if tighter policy slows growth expectations, demand-sensitive energy stocks can soften.", 2, 22),
    SeriesConfig("XLU", "Utilities Select Sector SPDR", "XLU", "Yahoo Finance", "XLU", "secondary", "credit-transmission", "daily", "price", "An ETF representing utility companies that often carry a lot of debt and pay dividends.", "Example: rising rates can hurt utilities because their borrowing gets more expensive and bonds become stronger competition.", 4, 23),
    SeriesConfig("UNRATE", "Unemployment Rate", "Unemployment", "FRED", "UNRATE", "tertiary", "macro-outcomes", "monthly", "percent", "The share of the labor force that is actively looking for work but does not have a job.", "Example: after prolonged tightening, unemployment may drift higher as hiring slows.", 9, 24),
    SeriesConfig("PAYEMS", "Nonfarm Payrolls", "Payrolls", "FRED", "PAYEMS", "tertiary", "macro-outcomes", "monthly", "thousands of jobs", "The total number of paid U.S. jobs outside the farm sector.", "Example: if payroll growth cools after rate hikes, it suggests the labor market is losing momentum.", 8, 25),
    SeriesConfig("CPIAUCSL", "Consumer Price Index", "CPI", "FRED", "CPIAUCSL", "tertiary", "macro-outcomes", "monthly", "index", "A widely used inflation measure based on the prices households pay for goods and services.", "Example: if CPI slows months after hikes, that suggests demand may be cooling.", 7, 26),
    SeriesConfig("PCEPI", "PCE Price Index", "PCE", "FRED", "PCEPI", "tertiary", "macro-outcomes", "monthly", "index", "The Fed's preferred inflation measure, based on personal consumption spending.", "Example: policymakers often cite PCE when explaining whether inflation is moving back toward target.", 6, 27),
    SeriesConfig("HOUST", "Housing Starts", "Housing Starts", "FRED", "HOUST", "tertiary", "macro-outcomes", "monthly", "thousands of units", "The number of new residential construction projects started in a month.", "Example: if high rates cool the housing market, builders may start fewer new homes.", 4, 28),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch monetary policy series from APIs and build the static dashboard data package."
    )
    parser.add_argument(
        "--fred-api-key",
        default=os.getenv("FRED_API_KEY"),
        help="FRED API key. Defaults to the FRED_API_KEY environment variable.",
    )
    parser.add_argument(
        "--start-date",
        default="2000-01-01",
        help="Inclusive observation start date for API requests.",
    )
    parser.add_argument(
        "--end-date",
        default=datetime.now(timezone.utc).date().isoformat(),
        help="Inclusive observation end date for API requests.",
    )
    return parser.parse_args()


def ensure_directories() -> None:
    CLEAN_DIR.mkdir(parents=True, exist_ok=True)
    DASHBOARD_DATA_DIR.mkdir(parents=True, exist_ok=True)


def require_fred_api_key(api_key: str | None) -> str:
    if api_key:
        return api_key

    raise SystemExit(
        "FRED API key missing. Set FRED_API_KEY or pass --fred-api-key before running the data build."
    )


def format_number(value: float | int | None, digits: int = 6) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round(float(value), digits)


def format_series_for_json(series: pd.Series) -> list[float | None]:
    return [format_number(value) for value in series.tolist()]


def monthly_resample(series: pd.Series) -> pd.Series:
    return series.resample("MS").last()


def zscore(series: pd.Series) -> pd.Series:
    valid = series.dropna()
    if valid.empty:
        return pd.Series(index=series.index, dtype="float64")

    std = valid.std(ddof=0)
    if pd.isna(std) or std == 0:
        return pd.Series(
            [0.0 if pd.notna(value) else None for value in series],
            index=series.index,
            dtype="float64",
        )

    return (series - valid.mean()) / std


def build_event_id(row: pd.Series) -> str:
    return f"{row['date'].strftime('%Y-%m-%d')}-{row['direction']}"


def event_label(row: pd.Series) -> str:
    change_bp = int(round(float(row["change_pct"]) * 100))
    sign = "+" if change_bp > 0 else ""
    return f"{row['date'].strftime('%b %d, %Y')} {row['direction'].title()} ({sign}{change_bp} bp)"


def fetch_fred_series(config: SeriesConfig, api_key: str, start_date: str, end_date: str) -> pd.Series:
    response = requests.get(
        FRED_OBSERVATIONS_URL,
        params={
            "series_id": config.remote_id,
            "api_key": api_key,
            "file_type": "json",
            "observation_start": start_date,
            "observation_end": end_date,
            "sort_order": "asc",
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    observations = payload.get("observations", [])

    frame = pd.DataFrame(
        {
            "date": [item.get("date") for item in observations],
            config.id: [
                None if item.get("value") in (None, ".") else float(item["value"])
                for item in observations
            ],
        }
    )
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    return frame.dropna(subset=["date"]).set_index("date")[config.id].sort_index()


def fetch_yahoo_series(config: SeriesConfig, start_date: str, end_date: str) -> pd.Series:
    try:
        import yfinance as yf
    except ModuleNotFoundError as error:
        raise SystemExit(
            "yfinance is required for Yahoo Finance downloads. Install it with `python -m pip install yfinance`."
        ) from error

    history = yf.download(
        tickers=config.remote_id,
        start=start_date,
        end=end_date,
        auto_adjust=True,
        progress=False,
        threads=False,
    )
    if history.empty:
        raise RuntimeError(f"No Yahoo Finance data returned for {config.remote_id}")

    close_series = history["Close"].copy()
    if isinstance(close_series, pd.DataFrame):
        close_series = close_series.iloc[:, 0]

    close_series.index = pd.to_datetime(close_series.index)
    close_series.name = config.id
    return close_series.sort_index()


def fetch_series(config: SeriesConfig, fred_api_key: str, start_date: str, end_date: str) -> pd.Series:
    print(f"Fetching {config.id} from {config.source}...")
    if config.source == "FRED":
        return fetch_fred_series(config, fred_api_key, start_date, end_date)

    return fetch_yahoo_series(config, start_date, end_date)


def load_event_reference() -> pd.DataFrame:
    if not EVENTS_PATH.exists():
        raise FileNotFoundError(
            f"Missing FOMC event reference file: {EVENTS_PATH}"
        )

    events = pd.read_csv(EVENTS_PATH, parse_dates=["date"]).sort_values("date")
    events["month"] = events["date"].dt.to_period("M").dt.to_timestamp()
    events["id"] = events.apply(build_event_id, axis=1)
    events["label"] = events.apply(event_label, axis=1)
    events["basis_points"] = (events["change_pct"] * 100).round().astype(int)
    return events


def build_clean_outputs(fred_api_key: str, start_date: str, end_date: str) -> None:
    monthly_frames: list[pd.Series] = []
    source_ranges: dict[str, dict[str, str | int | None]] = {}

    for config in SERIES:
        raw_series = fetch_series(config, fred_api_key, start_date, end_date)
        monthly_series = monthly_resample(raw_series)
        monthly_frames.append(monthly_series.rename(config.id))

        valid = raw_series.dropna()
        source_ranges[config.id] = {
            "source_start": valid.index.min().date().isoformat() if not valid.empty else None,
            "source_end": valid.index.max().date().isoformat() if not valid.empty else None,
            "source_rows": int(valid.shape[0]),
        }

    values = pd.concat(monthly_frames, axis=1).sort_index()
    values = values.loc[values.index.min() : values.index.max()].ffill()
    zscores = values.apply(zscore)

    fred_columns = [config.id for config in SERIES if config.source == "FRED"]
    yahoo_columns = [config.id for config in SERIES if config.source == "Yahoo Finance"]

    fred_monthly = values[fred_columns].reset_index().rename(columns={"index": "date"})
    yahoo_monthly = values[yahoo_columns].reset_index().rename(columns={"index": "date"})
    dashboard_monthly = values.reset_index().rename(columns={"index": "date"})
    dashboard_monthly_zscores = zscores.reset_index().rename(columns={"index": "date"})

    for frame in [fred_monthly, yahoo_monthly, dashboard_monthly, dashboard_monthly_zscores]:
        frame["date"] = pd.to_datetime(frame["date"]).dt.date

    fred_monthly.to_csv(CLEAN_DIR / "fred_monthly.csv", index=False)
    yahoo_monthly.to_csv(CLEAN_DIR / "yahoo_monthly.csv", index=False)
    dashboard_monthly.to_csv(CLEAN_DIR / "dashboard_monthly.csv", index=False)
    dashboard_monthly_zscores.to_csv(CLEAN_DIR / "dashboard_monthly_zscores.csv", index=False)

    events = load_event_reference()

    series_meta = []
    for config in SERIES:
        valid = values[config.id].dropna()
        latest_date = valid.index.max().date().isoformat() if not valid.empty else None
        latest_value = valid.iloc[-1] if not valid.empty else None
        series_meta.append(
            {
                **asdict(config),
                **source_ranges[config.id],
                "latest_date": latest_date,
                "latest_value": format_number(latest_value),
                "minimum_value": format_number(valid.min() if not valid.empty else None),
                "maximum_value": format_number(valid.max() if not valid.empty else None),
            }
        )

    events_payload = []
    for _, row in events.iterrows():
        events_payload.append(
            {
                "id": row["id"],
                "date": row["date"].date().isoformat(),
                "month": row["month"].date().isoformat(),
                "label": row["label"],
                "direction": row["direction"],
                "rate_before": format_number(row["rate_before"]),
                "rate_after": format_number(row["rate_after"]),
                "change_pct": format_number(row["change_pct"]),
                "basis_points": int(row["basis_points"]),
            }
        )

    payload = {
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "date_start": values.index.min().date().isoformat(),
            "date_end": values.index.max().date().isoformat(),
            "series_count": len(SERIES),
            "event_count": int(events.shape[0]),
            "sources": ["FRED API", "Yahoo Finance via yfinance", "Static FOMC event reference"],
            "notes": [
                "Series data is fetched from APIs at build time, then converted into a static dashboard JSON file.",
                "Daily and weekly series are resampled to month-start using the last observation in each month.",
                "FOMC meeting metadata comes from data/fomc_events.csv so the dashboard can preserve full meeting history, including hold events.",
            ],
        },
        "layers": LAYER_META,
        "lenses": LENS_META,
        "series": series_meta,
        "dates": [timestamp.date().isoformat() for timestamp in values.index],
        "values": {column: format_series_for_json(values[column]) for column in values.columns},
        "zscores": {column: format_series_for_json(zscores[column]) for column in zscores.columns},
        "events": events_payload,
        "defaults": {
            "primary_event_id": "2022-03-16-hike",
            "comparison_event_id": "2020-03-15-cut",
            "indicator_id": None,
            "lens_id": "full-cascade",
            "value_mode": "zscore",
            "timeline_offset_months": 6,
            "max_timeline_offset_months": 36,
        },
    }

    canonical_path = CLEAN_DIR / "dashboard-data.json"
    with canonical_path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2)

    shutil.copy2(canonical_path, DASHBOARD_DATA_DIR / "dashboard-data.json")

    print(f"Wrote {canonical_path}")
    print(f"Copied dashboard data to {DASHBOARD_DATA_DIR / 'dashboard-data.json'}")


def main() -> None:
    args = parse_args()
    ensure_directories()
    fred_api_key = require_fred_api_key(args.fred_api_key)
    build_clean_outputs(fred_api_key, args.start_date, args.end_date)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
