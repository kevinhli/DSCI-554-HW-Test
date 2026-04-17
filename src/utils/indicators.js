export const LAYERS = [
  {
    id: 1,
    name: "Policy Decision",
    windowDays: 5,
    indicators: [
      { key: "DFF", label: "Fed Funds Rate", description: "The overnight rate banks charge each other, set by the Federal Reserve.", file: "fred_DFF.csv", col: "DFF", unit: "percent", cascade: true },
      { key: "DFEDTARU", label: "Target Upper", description: "The top of the Fed's target range for the federal funds rate.", file: "fred_DFEDTARU.csv", col: "DFEDTARU", unit: "percent", cascade: false },
      { key: "DFEDTARL", label: "Target Lower", description: "The bottom of the Fed's target range for the federal funds rate.", file: "fred_DFEDTARL.csv", col: "DFEDTARL", unit: "percent", cascade: false },
    ],
  },
  {
    id: 2,
    name: "Immediate Market",
    windowDays: 10,
    indicators: [
      { key: "DGS2", label: "2Y Treasury", description: "The U.S. government's two-year borrowing cost; sensitive to near-term rate expectations.", file: "fred_DGS2.csv", col: "DGS2", unit: "percent", cascade: true },
      { key: "DGS10", label: "10Y Treasury", description: "The U.S. government's ten-year borrowing cost; a benchmark for mortgages and long rates.", file: "fred_DGS10.csv", col: "DGS10", unit: "percent", cascade: true },
      { key: "DGS30", label: "30Y Treasury", description: "The U.S. government's thirty-year borrowing cost; reflects very long-term rate expectations.", file: "fred_DGS30.csv", col: "DGS30", unit: "percent", cascade: false },
      { key: "T10Y2Y", label: "Yield Curve", description: "Ten-year minus two-year Treasury yields; steep or inverted shapes signal growth and rate views.", file: "fred_T10Y2Y.csv", col: "T10Y2Y", unit: "percent", cascade: false },
      { key: "GSPC", label: "S&P 500", description: "A broad stock-market index tracking 500 large U.S. companies.", file: "yahoo_GSPC.csv", col: "^GSPC", unit: "index", cascade: true },
      { key: "DJI", label: "Dow Jones", description: "A stock index of 30 large U.S. companies, often called the Dow.", file: "yahoo_DJI.csv", col: "^DJI", unit: "index", cascade: false },
      { key: "VIX", label: "VIX", description: "A market fear gauge based on expected stock volatility.", file: "yahoo_VIX.csv", col: "^VIX", unit: "index", cascade: true },
      { key: "GLD", label: "Gold", description: "An exchange-traded fund that tracks the price of gold.", file: "yahoo_GLD.csv", col: "GLD", unit: "index", cascade: false },
      { key: "BTC", label: "Bitcoin", description: "A decentralized digital currency whose price is set by buyers and sellers on markets.", file: "yahoo_BTC-USD.csv", col: "BTC-USD", unit: "index", cascade: false },
      { key: "VEU", label: "World ex-US", description: "An ETF of stocks in developed and emerging markets outside the United States.", file: "yahoo_VEU.csv", col: "VEU", unit: "index", cascade: false },
      { key: "EEM", label: "Emerging Mkts", description: "An ETF tracking stocks in emerging-market countries.", file: "yahoo_EEM.csv", col: "EEM", unit: "index", cascade: false },
    ],
  },
  {
    id: 3,
    name: "Secondary Effects",
    windowDays: 30,
    indicators: [
      { key: "BAA", label: "Corp Bond Yield", description: "Average yield on lower-rated corporate bonds; rises when lenders worry more about defaults.", file: "fred_BAA.csv", col: "BAA", unit: "percent", cascade: true },
      { key: "MORTGAGE30US", label: "30Y Mortgage", description: "The average interest rate on a new 30-year fixed-rate home loan.", file: "fred_MORTGAGE30US.csv", col: "MORTGAGE30US", unit: "percent", cascade: true },
      { key: "DPRIME", label: "Prime Rate", description: "The rate banks charge their most creditworthy business customers; tends to follow Fed moves.", file: "fred_DPRIME.csv", col: "DPRIME", unit: "percent", cascade: false },
    ],
  },
  {
    id: 4,
    name: "Tertiary Effects",
    windowDays: 90,
    indicators: [
      { key: "UNRATE", label: "Unemployment", description: "Share of the labor force that is jobless and actively looking for work.", file: "fred_UNRATE.csv", col: "UNRATE", unit: "percent", cascade: true },
      { key: "PAYEMS", label: "Payrolls", description: "Total nonfarm payroll jobs; shows how many people employers are paying each month.", file: "fred_PAYEMS.csv", col: "PAYEMS", unit: "thousands", cascade: false },
      { key: "CPIAUCSL", label: "CPI", description: "A price index for a basket of consumer goods and services; a common measure of inflation.", file: "fred_CPIAUCSL.csv", col: "CPIAUCSL", unit: "index", cascade: true },
      { key: "PCEPI", label: "PCE Index", description: "A broad consumer price index the Federal Reserve watches closely for inflation trends.", file: "fred_PCEPI.csv", col: "PCEPI", unit: "index", cascade: false },
      { key: "HOUST", label: "Housing Starts", description: "New residential construction begun each month; a read on housing demand and building.", file: "fred_HOUST.csv", col: "HOUST", unit: "thousands", cascade: false },
      { key: "M2SL", label: "M2 Money Stock", description: "A broad tally of cash, bank deposits, and other liquid savings in the economy.", file: "fred_M2SL.csv", col: "M2SL", unit: "billions", cascade: true },
    ],
  },
];

export const ALL_INDICATORS = LAYERS.flatMap((l) =>
  l.indicators.map((ind) => ({ ...ind, layerId: l.id, layerName: l.name }))
);
