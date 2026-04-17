# Policy Ripple LA: Fed to Front Door

An interactive React dashboard about one specific monetary-policy story:

How do Federal Reserve rate decisions feed into 30-year mortgage rates, and how do those borrowing-cost changes show up later in home prices across Los Angeles neighborhoods?

This version narrows the original broad macro dashboard into a Los Angeles-focused housing system that is easier to explain, demo, and defend.

## Purpose

The project focuses on a single transmission chain:

1. The Fed changes policy or signals a new direction.
2. Mortgage rates reprice within weeks.
3. Neighborhood home prices respond more slowly, with different paths across Los Angeles clusters.

The goal is not to prove causation. The goal is to help viewers see timing, lag, neighborhood variation, and the difference between fast financial reactions and slower housing outcomes.

## What the Dashboard Shows

- `How the pressure reached LA`: a compact replacement for the earlier ripple concept, showing the order of movement from Fed decision to mortgage repricing to neighborhood price response.
- `Mortgage-rate reaction`: a meeting-centered chart of weekly 30-year fixed mortgage rates before and after each FOMC event.
- `Los Angeles neighborhood map`: the real Mapping L.A. neighborhood boundaries with a cluster timeline above it, plus two story lenses:
  - post-event home-price change
  - cooling vs prior pace
- `Why neighborhoods react`: a short explanation panel for the mechanism behind the pattern.
- `Neighborhood focus`: a selected-neighborhood view against the typical LA path.
- `Neighborhood leaderboard`: strongest gains and sharpest cooling after the chosen event.

## Design Principles

The dashboard follows a form-follows-function approach and is guided by Alberto Cairo's visualization wheel:

- `Truthful`: uses clearly labeled source data, avoids overstating causation, and includes limitations.
- `Functional`: narrows scope to one interpretable policy channel and one city instead of showing every macro indicator at once.
- `Insightful`: adds the "cooling vs prior pace" lens so the housing story is not reduced to only whether prices stayed positive.
- `Beautiful`: keeps the original visual character, but now uses the actual city neighborhood geometry and restrained 3D height markers so the map still feels distinctive without losing function.

## Tech Stack

- `React 19`
- `Vite`
- `D3.js`
- `Bootstrap` utility CSS

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Build For Production

```bash
npm run build
npm run preview
```

The Vite config uses relative asset paths, so the `dist/` folder is ready for static hosting on GitHub Pages, Netlify, Vercel, or another static host.

## Demo Flow

For a short class demo or presentation, use this sequence:

1. Start on the default meeting, `2022-06-15`, to show a memorable hiking-cycle example.
2. Read `How the pressure reached LA` from left to right.
3. Show the mortgage chart to explain the fast reaction window.
4. Use the cluster timeline above the map to show which parts of Los Angeles moved first.
5. Switch the map to `Did this neighborhood cool?` to show the more meaningful housing effect.
6. Click one neighborhood that cooled sharply and one that held up better.
7. End on the `Why neighborhoods react` panel and the limitations.

## Project Structure

```text
new_prototype/
  public/data/
    fomc_events.csv
    fred_MORTGAGE30US.csv
    la_neighborhood_zhvi.csv
  src/
    components/
      NeighborhoodHexMap.jsx
      HousingRankingPanel.jsx
      HousingStateDetail.jsx
      HousingStoryPanel.jsx
      HousingTransmissionBeat.jsx
      MortgageReactionChart.jsx
      HelpModal.jsx
      NavBar.jsx
    hooks/
      useHousingData.js
    pages/
      MethodsPage.jsx
    utils/
      laNeighborhoods.js
      housingProcessing.js
      theme.js
    App.jsx
    main.jsx
  README.md
  package.json
  vite.config.js
```

## Data Sources

- `FOMC event table`: repository event list for meeting dates, direction, and policy change.
- `FRED MORTGAGE30US`: Freddie Mac 30-year fixed mortgage rate series served through FRED.
- `Zillow Neighborhood ZHVI`: monthly smoothed neighborhood home values, matched to 86 Mapping L.A. neighborhoods.

## Method Notes

- Mortgage response is measured with a 4-week pre-meeting average and a 6-week post-meeting average that begins 1 week after the meeting.
- Housing response is measured with monthly neighborhood home-value data at 3-month, 6-month, or 12-month horizons.
- The `Did this neighborhood cool?` lens compares post-event home-price growth with the same-length period immediately before the event.
- The map uses the real Mapping L.A. neighborhood boundaries, while small hex columns show which neighborhoods were already more expensive at the meeting month.

## Limits

- Mortgage rates move faster than home prices.
- Home prices can keep rising even when affordability is worsening.
- Neighborhood-level housing outcomes also reflect inventory, migration, local labor markets, and supply constraints.
- The dashboard is descriptive, not causal.

## If You Need the Repository Rubric to Read Cleanly

This repo is organized so a reviewer can quickly find:

- `setup`: this README
- `usage`: local run/build instructions
- `system description`: purpose, views, and method notes above
- `implementation`: React components, hooks, and utilities grouped by role
- `deployment path`: static `dist/` output from Vite

If you want, the next practical step after this is to publish `dist/` and add the live URL to this README before submission.
