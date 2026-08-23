export type GuideFormat = "markdown" | "json";
export type GuidePhase = "build" | "design";

export const guide = {
  version: 3,
  contract: {
    authoredFiles: ["dashboard.svelte", "queryloom.yaml"],
    entrypoint: "dashboard.svelte must have a default Svelte component export.",
    library: "The CLI configures @queryloom/library before the dashboard mounts.",
  },
  capabilities: {
    data: ["Local CSV", "Local Parquet", "DuckDB-Wasm SQL through query<T>(sql)"],
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
    prefer: "Use LayerChart motion; for time-series, a one-time path draw is appropriate.",
    avoid: ["Looping motion", "Decorative motion", "Motion that obscures data comparison"],
    accessibility: "Respect prefers-reduced-motion.",
    documentation: "https://next.layerchart.com/docs/guides/animation",
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
    "For a LineChart path animation, render Spline inside the marks snippet and use its draw prop (for example draw={reducedMotion ? false : { duration: 350 }}); do not use a CSS-only reveal or a motion prop on Spline.",
    "Use a 200–500ms LayerChart draw animation for the primary visualization when it first renders or meaningfully changes; avoid looping or decorative motion and respect prefers-reduced-motion.",
    "Use Tailwind utilities without adding a Tailwind config or CSS entry file.",
    "Use <style> only for component-specific styling that is awkward as utilities.",
  ],
  limits: [
    "No remote connectors, authentication, or server-side queries.",
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

## State and charts

- Use Svelte 5 runes (\`$state\`, \`$derived\`) for dashboard state and derived values. Use local state for filters in v0; shareable URL state is not available yet.
- Compose visualizations directly with generic LayerChart components imported from \`layerchart\`; do not add domain-specific chart wrappers such as \`RevenueTrend\` to the library.
- Use the official LayerChart LLM documentation for component details: \`https://next.layerchart.com/llms.txt\`.
- Give the primary visualization a short, meaningful 200–500ms LayerChart motion on first render or data/filter changes. For a line chart, render \`Spline\` in the \`marks\` snippet and use its \`draw\` prop; do not substitute a CSS reveal or a \`motion\` prop on \`Spline\`. For time-series, a one-time path draw is appropriate. Do not use looping or decorative motion, and respect \`prefers-reduced-motion\`. See \`https://next.layerchart.com/docs/guides/animation\`.

## Visual direction

Build a compact data app that answers one question, rather than a dense BI control panel. A strong default composition is: title and short context, a small aligned KPI summary, then one primary chart. Add a secondary chart or compact table only when it helps answer the same question.

The following palette is a built-in guide, not a constraint. Start from a quiet \`#f8f8f8\` background, \`#231f20\` text, \`#6a6a6a\` muted text, and primary \`#0777b3\`. For categorical data use \`#0777b3\`, \`#bd4e35\`, \`#2d7a00\`, \`#e18727\`, \`#638cad\`, and \`#adadad\`. Reserve \`#2d7a00\` and \`#bc1200\` for genuinely positive or negative meaning; do not map ordinary movement up and down to green and red automatically.

Prefer restrained borders, a single primary accent, and an aligned KPI summary over oversized decorative cards. You may deliberately depart from this visual direction when the dashboard's subject calls for a different treatment.

## Styling

- Tailwind CSS is built in. Use utility classes directly; do not add Tailwind configuration or a CSS entry file.
- Use a Svelte \`<style>\` block only for component-specific styling that utilities cannot express cleanly.

## Boundaries

This version supports only local CSV/Parquet resources and browser-local SQL. Do not add remote connectors, authentication, external scripts/stylesheets, dynamic npm imports, routing, or publishing controls.
`;
}

export function renderDesignGuide(format: GuideFormat = "markdown"): string {
  const designGuide = {
    version: 1,
    purpose: "Turn inspected local data into a concise dashboard plan before writing dashboard.svelte.",
    requiredInput: "Inspect source files with queryloom inspect <file> --format json; after creating queryloom.yaml, inspect its declared resources with queryloom inspect --root . --format json.",
    process: [
      "State the decision or question this dashboard should answer in one sentence.",
      "Identify the grain of each inspected table, its measures, dimensions, and any reliable time field.",
      "Define 2–4 KPIs and one primary chart. Every metric must name its source table, aggregation, time range, and filter scope.",
      "Choose only filters supported by inspected columns. Do not invent columns, joins, targets, or business meanings.",
      "Call out data-quality caveats visible in nulls, cardinality, ranges, or samples.",
      "Then create queryloom.yaml and dashboard.svelte. Follow queryloom guide for the implementation phase.",
    ],
    boundaries: [
      "Inspection is read-only and local.",
      "Inspect CSV, Parquet, or DuckDB files locally. Dashboard resources in v0 must be CSV or Parquet.",
      "Do not make up metric definitions from column names alone; state uncertainty instead.",
    ],
  } as const;

  if (format === "json") return `${JSON.stringify(designGuide, null, 2)}\n`;
  return `# Queryloom data-design guide

Before writing a dashboard, inspect every source file with \`queryloom inspect <file> --format json\` and use the complete output as evidence. After declaring CSV or Parquet resources in \`queryloom.yaml\`, run \`queryloom inspect --root . --format json\` to verify the project-facing table names. Inspection is local and read-only.

## Required design process

1. State the single decision or question this dashboard answers.
2. Identify each table's grain, measures, dimensions, and reliable time field from the inspection output.
3. Define 2–4 KPIs and one primary chart. For every metric, name its source table, aggregation, time range, and filter scope.
4. Choose only filters supported by inspected columns. Do not invent joins, targets, columns, or business meanings.
5. Name data-quality caveats visible in null counts, cardinality, ranges, or sample rows.
6. Then author \`queryloom.yaml\` and \`dashboard.svelte\`; use \`queryloom guide\` for Svelte, SQL, visual, and animation rules.

## Boundaries

- Treat inspection as evidence, not a semantic layer. If a column's meaning is uncertain, say so.
- Keep the plan compact: one question, a small KPI set, and one primary visualization.
- \`.duckdb\` files can be inspected, but v0 dashboards declare local CSV or Parquet resources only.
`;
}
