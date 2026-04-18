# AGENT.md

## Project Snapshot

This project is a React + Vite dashboard about one focused question:

**How do Federal Reserve rate decisions flow into mortgage rates, and how do those borrowing-cost changes show up later in home prices across Los Angeles neighborhoods?**

The dashboard has already been narrowed away from the original broad macro concept. The current version is deliberately scoped to:

- Los Angeles neighborhoods
- mortgage-rate response
- neighborhood home-price response
- timing / lag / clustering
- presentation-friendly storytelling

This is the current working source in:

`C:\Users\14124\Documents\project-team-09-main\new_prototype`

A GitHub mirror was also pushed to:

`https://github.com/kevinhli/DSCI-554-HW-Test.git`

## What Matters Most

The project should stay:

- understandable to the general public
- visually strong, but still functional
- presentation-friendly
- honest about limits
- centered on Los Angeles neighborhoods, not the whole U.S.

The guiding design idea is **form follows function** with **Alberto Cairo's visualization wheel** in mind:

- truthful
- functional
- insightful
- beautiful

Do not let it drift back into a generic "all indicators" dashboard unless the owner explicitly asks for that.

## Current Story Structure

The intended story is:

1. The Fed meeting happens.
2. Mortgage rates reprice first.
3. Los Angeles neighborhoods respond more slowly.
4. Different parts of Los Angeles react differently.
5. The more useful housing question is often not "did prices fall?" but "did price growth cool relative to before?"

## How To Run

From the project root:

```bash
npm install
npm run dev
```

Open:

`http://localhost:5173`

Validation:

```bash
npm run lint
npm run build
```

## Important Files

### App shell

- `src/App.jsx`
- `src/main.jsx`

These control the overall layout, event switching, top-level views, motion, and page styling.

### Data loading

- `src/hooks/useHousingData.js`

This is the main loader for:

- FOMC events
- mortgage-rate series
- LA neighborhood price data
- LA neighborhood geometry

### Core housing logic

- `src/utils/housingProcessing.js`
- `src/utils/laNeighborhoods.js`

These define:

- horizon calculations
- change / acceleration / relative-to-median logic
- neighborhood metadata
- cluster labels and colors
- summary calculations
- lag/forecast/spread helpers

### Key views

- `src/components/NeighborhoodHexMap.jsx`
- `src/components/MortgageReactionChart.jsx`
- `src/components/HousingLagView.jsx`
- `src/components/HousingSpreadView.jsx`
- `src/components/HousingPaceShiftView.jsx`
- `src/components/HousingStateDetail.jsx`
- `src/components/HousingRankingPanel.jsx`
- `src/components/HousingTransmissionBeat.jsx`
- `src/components/HousingStoryPanel.jsx`

### Docs

- `README.md`
- `docs/demo-script.md`
- `src/pages/MethodsPage.jsx`

## Important Data Files

- `public/data/fomc_events.csv`
- `public/data/fred_MORTGAGE30US.csv`
- `public/data/la_neighborhood_zhvi.csv`
- `public/data/la_times_neighborhoods.geojson`

There is also:

- `public/data/la_zillow_all.csv`

This file is large and useful as source material, but GitHub warned about its size. Keep that in mind before expanding the repo further.

## What The Main Views Are Doing

### 1. Neighborhood timeline

This shows the selected neighborhood against LA cluster medians over time, indexed to the meeting month.

Recent UX intent:

- selected neighborhood should be obvious
- other cluster lines should be quiet context
- timeline should help the map feel less isolated

### 2. Neighborhood boundary map

This uses real Mapping L.A. geometry, not a fake schematic.

Current map behavior:

- fill color tells a neighborhood story
- column height reinforces magnitude
- hover explains the neighborhood
- selection drives linked panels

Important:

- for the main change view, color was adjusted to compare a neighborhood against the **typical LA move**, because raw positive/negative change made the map too uniformly warm in some meetings
- the map should stay legible first and "cool" second

### 3. Response lag

This is the clearest timing explanation view:

- Fed first
- mortgages next
- housing later

It should remain very readable for non-technical viewers.

### 4. Neighborhood spread

This is the more advanced distribution view.

It should still be understandable:

- dots are neighborhoods
- higher means stronger gains
- band shows the middle half
- selected neighborhood path is highlighted

### 5. Before vs after

This compares growth before the meeting with growth afterward.

Current intention:

- selected neighborhood is the main read
- the strongest slowdown and strongest speed-up stay highlighted
- most other lines are muted context

## Important Codebase Note

Some code still uses names like:

- `stateCode`
- `stateName`
- `selectedState`

Those are **legacy naming leftovers** from the older state-level version.

Semantically, they now mean:

- neighborhood code
- neighborhood name
- selected neighborhood

Be careful not to misread that when editing logic.

## UX / Design Constraints

Please preserve these unless there is a strong reason not to:

- dark visual theme
- smooth event-change transitions
- clean presentation layout
- strong selection emphasis
- real LA neighborhood map
- simple reading rules for general audiences

Avoid:

- giant text-heavy explainer blocks
- too many equally loud colors at once
- bringing back a cluttered "everything macro" dashboard
- adding complexity without improving understanding

## Presentation Context

This project is meant to be demoed and presented.

That means new changes should help with:

- explaining the story quickly
- making the interaction sequence easy to narrate
- showing one strong takeaway per view
- keeping the repo clean enough for rubric review

## Good Demo Flow

Recommended short demo flow:

1. Start on a strong event such as `2022-06-15`.
2. Explain the "Fed -> mortgages -> neighborhoods" chain.
3. Show the mortgage reaction window.
4. Use the timeline + map together to show neighborhood variation.
5. Switch to the "cooling" lens.
6. Click one neighborhood that cooled a lot and one that held up.
7. Use the detail panel to explain that housing response is uneven and lagged.

## Known Risks / Open Areas

- The repo contains a large raw Zillow CSV.
- Some panels still carry names from the earlier broader version.
- There is room to further simplify certain advanced views for general audiences.
- The map is now much better than before, but it still needs to stay carefully balanced between clarity and visual ambition.

## Best Next Improvements

If someone continues this project, the best high-value next steps are:

1. Add a lightweight deployment and live URL to the README.
2. Further simplify labels/tooltips for public-facing presentation.
3. Make sure the selected neighborhood is consistently emphasized in every linked chart.
4. Audit any remaining "state" naming for clarity.
5. Consider trimming unused legacy components if they are no longer part of the story.

## Handoff Summary

If you are taking over this dashboard, the safest mental model is:

- this is **not** a generic econ dashboard
- this is a **Los Angeles housing response** dashboard
- the main design challenge is **clarity with some visual sophistication**
- every view should answer a specific question the presenter can explain in one sentence

If you change the dashboard, keep asking:

**Does this make the housing story clearer for a regular person?**

If not, it is probably not worth adding.
