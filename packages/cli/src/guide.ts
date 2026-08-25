export type GuideFormat = "markdown" | "json";
export type GuidePhase = "build" | "design";

export const guide = {
  version: 5,
  contract: {
    authoredFiles: ["dashboard.svelte", "queryloom.yaml"],
    entrypoint: "dashboard.svelte must have a default Svelte component export.",
    library: "The CLI configures @queryloom/library before the dashboard mounts.",
  },
  capabilities: {
    data: ["Project CSV/Parquet files", "External HTTP(S) CSV/Parquet files", "DuckDB-Wasm SQL through query<T>(sql)"],
    styling: ["Tailwind CSS utilities", "Svelte component <style> blocks"],
    charts: ["LayerChart 2 supplied directly by the CLI"],
  },
  design: {
    intent: "Build a compact data app that answers one question, not a dense BI control panel.",
    colors: {
      background: "#f8f8f8",
      text: "#231f20",
      muted: "#6a6a6a",
      primary: "#0777b3",
      palette: ["#0777b3", "#bd4e35", "#2d7a00", "#e18727", "#638cad", "#adadad"],
      positive: "#2d7a00",
      negative: "#bc1200",
    },
    layout: [
      "Keep the default dashboard focused and compact: title, short context, a small KPI summary, and one primary chart.",
      "Use color to communicate category or semantic meaning; do not automatically make every increase green or decrease red.",
      "Prefer a quiet page background, readable dark text, restrained borders, and one primary accent.",
      "Treat KPI values as an aligned summary strip by default, not a grid of oversized decorative cards.",
    ],
  },
  animation: {
    requiredFor: "The primary visualization",
    purpose: "Show a meaningful first render or data/filter state change.",
    duration: "200–500ms",
    prefer: "Use LayerChart chart marks; for time-series, a one-time path draw is appropriate.",
    avoid: ["Looping motion", "Decorative motion", "Motion that obscures data comparison"],
    accessibility: "Respect prefers-reduced-motion.",
    documentation: "https://next.layerchart.com/docs/guides/animation",
  },
  transitions: {
    purpose: "Make filter-driven changes feel continuous while preserving comparison and accessibility.",
    prefer:
      "Keep the page shell stable. Use short Svelte transitions for changed summaries, supporting text, or tables; let LayerChart animate the chart marks.",
    duration: "150–250ms for UI transitions; 200–500ms for chart-mark animation.",
    accessibility: "Respect prefers-reduced-motion and avoid a transition for every repeated row.",
  },
  rules: [
    "Import query from @queryloom/library and generic chart components from layerchart.",
    "Use tables declared in queryloom.yaml and quote their SQL identifiers when needed.",
    "Split independent dashboard sections into independent queries so each can load or fail alone.",
    "Keep the page shell visible while data loads; render a local skeleton or loading state per section.",
    "Normalize query values before display, for example Number(row.revenue) and String(row.month).",
    "Format dates and fill missing time buckets in SQL when a chart needs a continuous timeline.",
    "Use local Svelte state for filters in v0. Shareable URL state is not available yet.",
    "Apply a filter consistently to every metric that claims the filtered scope; label intentionally global metrics explicitly.",
    "When a filter event triggers a query, read the event's selected value and pass it to the query function explicitly; do not rely on a derived SQL clause updating before the event handler runs.",
    "For a LineChart path animation, render Spline inside the marks snippet and use its draw prop (for example draw={reducedMotion ? false : { duration: 350 }}); do not use a CSS-only reveal or a motion prop on Spline.",
    "Use a 200–500ms LayerChart draw animation for the primary visualization when it first renders or meaningfully changes; avoid looping or decorative motion and respect prefers-reduced-motion.",
    "When a filter changes, keep the page shell stable. Use a restrained 150–250ms Svelte transition for the changed summary, supporting text, or table; let LayerChart animate chart marks instead of wrapping the entire chart in a competing transition.",
    "Use a keyed Svelte block only around content that genuinely changes with the filter, not around the whole dashboard. Respect prefers-reduced-motion and do not animate every repeated table row.",
    "Use Tailwind utilities without adding a Tailwind config or CSS entry file.",
    "Use <style> only for component-specific styling that is awkward as utilities.",
    "Before handing off, run queryloom check, then queryloom build.",
  ],
  limits: [
    "No remote database connectors, authentication, or server-side queries. External static CSV/Parquet URLs are supported when CORS permits browser access.",
    "No external scripts, stylesheets, or runtime-loaded npm packages.",
    "No multiple-dashboard routing or embedded publishing controls.",
  ],
} as const;

export function renderGuide(format: GuideFormat = "markdown"): string {
  if (format === "json") return `${JSON.stringify(guide, null, 2)}\n`;

  return `# Queryloom dashboard guide

## Contract

Author exactly these files: \`dashboard.svelte\` and \`queryloom.yaml\`. The CLI configures \`@queryloom/library\` before the dashboard mounts. Use a normal Svelte component as the dashboard default export.

## Runtime API

\`@queryloom/library\` provides \`query<T>(sql)\` for browser-local DuckDB-Wasm SQL. Import generic charts such as \`LineChart\`, \`BarChart\`, and \`AreaChart\` directly from \`layerchart\`; the Queryloom CLI supplies and resolves LayerChart, so no third authored file is needed.

\`\`\`svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { LineChart } from "layerchart";
  import { query } from "@queryloom/library";

  type RevenueRow = { month: string; revenue: number };
  let rows = $state<RevenueRow[]>([]);
  let loading = $state(true);

  onMount(async () => {
    const result = await query<RevenueRow>("SELECT month, SUM(revenue)::DOUBLE AS revenue FROM revenue GROUP BY month ORDER BY month");
    rows = result.map((row) => ({ month: String(row.month), revenue: Number(row.revenue) }));
    loading = false;
  });
</script>

{#if loading}
  <div class="h-72 animate-pulse rounded bg-black/10"></div>
{:else}
  <LineChart data={rows} x="month" y="revenue" yDomain={[0, null]} height={288} points />
{/if}
\`\`\`

## Data and query rules

- Read only tables declared in \`queryloom.yaml\`.
- Use an independent query for each independently rendered section.
- Keep the page structure visible while a section loads; show a local skeleton or loading state instead of replacing the whole page.
- Normalize values before display: \`Number(row.revenue)\`, \`String(row.month)\`.
- Format dates and generate missing time buckets in SQL for continuous time-series charts.
- Apply a filter consistently to every metric that claims the filtered scope. If a metric intentionally remains global, label it explicitly as global.
- When a filter event launches a query, read the selected value from the event and pass it to the query function explicitly. Do not rely on a derived SQL clause updating before the event handler runs.

## State and charts

- Use Svelte 5 runes (\`$state\`, \`$derived\`) for dashboard state and derived values. Use local state for filters in v0; shareable URL state is not available yet.
- Compose visualizations directly with generic LayerChart components imported from \`layerchart\`; do not add domain-specific chart wrappers such as \`RevenueTrend\` to the library.
- Use the official LayerChart LLM documentation for component details: \`https://next.layerchart.com/llms.txt\`.
- Give the primary visualization a short, meaningful 200–500ms LayerChart motion on first render or data/filter changes. For a line chart, render \`Spline\` in the \`marks\` snippet and use its \`draw\` prop; do not substitute a CSS reveal or a \`motion\` prop on \`Spline\`. For time-series, a one-time path draw is appropriate. Do not use looping or decorative motion, and respect \`prefers-reduced-motion\`. See \`https://next.layerchart.com/docs/guides/animation\`.
- Keep the page shell stable when a filter changes. Use a restrained 150–250ms Svelte transition only for the summary, supporting text, or table content that actually changes; a keyed block should not wrap the entire dashboard. Let LayerChart animate the chart marks, rather than competing with it by transitioning the whole chart container. Respect \`prefers-reduced-motion\` and do not animate every repeated table row.

## Visual direction

Build a compact data app that answers one question, rather than a dense BI control panel. A strong default composition is: title and short context, a small aligned KPI summary, then one primary chart. Add a secondary chart or compact table only when it helps answer the same question.

The following palette is a built-in guide, not a constraint. Start from a quiet \`#f8f8f8\` background, \`#231f20\` text, \`#6a6a6a\` muted text, and primary \`#0777b3\`. For categorical data use \`#0777b3\`, \`#bd4e35\`, \`#2d7a00\`, \`#e18727\`, \`#638cad\`, and \`#adadad\`. Reserve \`#2d7a00\` and \`#bc1200\` for genuinely positive or negative meaning; do not map ordinary movement up and down to green and red automatically.

Prefer restrained borders, a single primary accent, and an aligned KPI summary over oversized decorative cards. You may deliberately depart from this visual direction when the dashboard's subject calls for a different treatment.

## Styling

- Tailwind CSS is built in. Use utility classes directly; do not add Tailwind configuration or a CSS entry file.
- Use a Svelte \`<style>\` block only for component-specific styling that utilities cannot express cleanly.

## Boundaries

This version supports project-local or external HTTP(S) CSV/Parquet resources and browser-local SQL. For external data URLs, require CORS and a versioned immutable URL. Do not add remote database connectors, authentication, external scripts/stylesheets, dynamic npm imports, routing, or publishing controls.

## Verify

Run \`queryloom check\` after authoring the two dashboard files. It validates the project, local resource files, and an isolated Svelte/Tailwind static build without replacing \`dist/\`. Then run \`queryloom build\` to create the deployable output. External URLs are validated for format by \`check\`; their CORS and reachability are verified by the browser at runtime.
`;
}

export function renderDesignGuide(format: GuideFormat = "markdown"): string {
  const designGuide = {
    version: 4,
    purpose: "Turn inspected data inputs into a concise dashboard plan before writing dashboard.svelte.",
    requiredInput:
      "Inspect every supplied data path or HTTP(S) CSV/Parquet URL with queryloom inspect <path-or-url> --format json; after creating queryloom.yaml, inspect its declared resources with queryloom inspect --root . --format json.",
    process: [
      "When asked to visualize data, run this workflow without asking the user to restate these standard steps.",
      "Locate the supplied data inputs and inspect each one before deciding what to build.",
      "State the decision or question this dashboard should answer in one sentence.",
      "Identify the grain of each inspected table, its measures, dimensions, and any reliable time field.",
      "Define 2–4 KPIs and one primary chart. Every metric must name its source table, aggregation, time range, and filter scope.",
      "Choose only filters supported by inspected columns. Do not invent columns, joins, targets, or business meanings.",
      "Call out data-quality caveats visible in nulls, cardinality, ranges, or samples.",
      "Present 2–3 distinct, data-grounded dashboard directions. For each, state the question, primary chart, KPIs, filters, and caveats; recommend one direction.",
      "Ask the user to select or adjust a direction, then stop. Do not author queryloom.yaml or dashboard.svelte until the user confirms a direction.",
      "After confirmation, author queryloom.yaml and dashboard.svelte. Follow queryloom guide for the implementation phase, then run queryloom check and queryloom build.",
    ],
    boundaries: [
      "Inspection is read-only.",
      "Inspect local CSV, Parquet, or DuckDB files, or HTTP(S) CSV/Parquet URLs. Dashboard resources in v0 may be project-local or external HTTP(S) CSV/Parquet files.",
      "Do not make up metric definitions from column names alone; state uncertainty instead.",
    ],
  } as const;

  if (format === "json") return `${JSON.stringify(designGuide, null, 2)}\n`;
  return `# Queryloom data-design guide

When asked to visualize data, carry out this workflow without asking the user to repeat its standard steps. Before proposing a dashboard, inspect every supplied local path or HTTP(S) CSV/Parquet URL with \`queryloom inspect <path-or-url> --format json\` and use the complete output as evidence. Present options and obtain the user's direction before writing a dashboard. After declaring dashboard resources in \`queryloom.yaml\`, run \`queryloom inspect --root . --format json\` to verify the project-facing table names. Inspection is read-only.

## Input handling

- Identify the supplied file or files first. Inspect each input separately before selecting metrics or visuals.
- \`queryloom inspect\` can examine local CSV, Parquet, and \`.duckdb\` inputs. A \`.duckdb\` input may contain multiple tables; treat its discovered schema as design evidence.
- v0 dashboard resources are CSV or Parquet. A project-local \`path\` is copied to the static build; an external HTTP(S) \`url\` is fetched at runtime and must allow CORS. If the supplied input is only a \`.duckdb\` file, explain that it can be inspected but cannot yet be declared in \`queryloom.yaml\`; do not silently invent an export step.

## Required design process

1. Locate and inspect every supplied data input.
2. Identify each table's grain, measures, dimensions, and reliable time field from the inspection output.
3. Prepare 2–3 genuinely distinct dashboard directions. For each, state its question, primary chart, 2–4 KPIs, supported filters, and data-quality caveats. Every metric must name its source table, aggregation, time range, and filter scope.
4. Recommend one direction and explain the trade-off in one sentence. Choose only filters supported by inspected columns; do not invent joins, targets, columns, or business meanings.
5. Ask the user to select or adjust a direction, then stop. Do not author \`queryloom.yaml\` or \`dashboard.svelte\` in this phase.
6. After the user confirms a direction, author \`queryloom.yaml\` and \`dashboard.svelte\`; use \`queryloom guide\` for Svelte, SQL, visual, and animation rules. Run \`queryloom check\` and \`queryloom build\` before handing off.

## Boundaries

- Treat inspection as evidence, not a semantic layer. If a column's meaning is uncertain, say so.
- Keep the plan compact: one question, a small KPI set, and one primary visualization.
- \`.duckdb\` files can be inspected, but v0 dashboards declare CSV or Parquet resources via a project-local \`path\` or external HTTP(S) \`url\`.
`;
}
