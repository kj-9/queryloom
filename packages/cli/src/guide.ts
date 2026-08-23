export type GuideFormat = "markdown" | "json";

export const guide = {
  version: 1,
  contract: {
    authoredFiles: ["dashboard.svelte", "queryloom.yaml"],
    entrypoint: "dashboard.svelte must have a default Svelte component export.",
    runtime: "The CLI configures @queryloom/runtime before the dashboard mounts.",
  },
  capabilities: {
    data: ["Local CSV", "Local Parquet", "DuckDB-Wasm SQL through query<T>(sql)"],
    styling: ["Tailwind CSS utilities", "Svelte component <style> blocks"],
    charts: ["LayerCake for standard SVG charts", "d3-scale for scales"],
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
  rules: [
    "Import query and chart components only from @queryloom/runtime.",
    "Use tables declared in queryloom.yaml and quote their SQL identifiers when needed.",
    "Split independent dashboard sections into independent queries so each can load or fail alone.",
    "Keep the page shell visible while data loads; render a local skeleton or loading state per section.",
    "Normalize query values before display, for example Number(row.revenue) and String(row.month).",
    "Format dates and fill missing time buckets in SQL when a chart needs a continuous timeline.",
    "Use local Svelte state for filters in v0. Shareable URL state is not available yet.",
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

Author exactly these files: \`dashboard.svelte\` and \`queryloom.yaml\`. The CLI configures \`@queryloom/runtime\` before the dashboard mounts. Use a normal Svelte component as the dashboard default export.

## Runtime API

\`@queryloom/runtime\` provides \`query<T>(sql)\` for browser-local DuckDB-Wasm SQL and Svelte chart components such as \`RevenueTrend\`.

\`\`\`svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { query } from "@queryloom/runtime";

  type RevenueRow = { month: string; revenue: number };
  let rows = $state<RevenueRow[]>([]);
  let loading = $state(true);

  onMount(async () => {
    const result = await query<RevenueRow>("SELECT month, SUM(revenue)::DOUBLE AS revenue FROM revenue GROUP BY month ORDER BY month");
    rows = result.map((row) => ({ month: String(row.month), revenue: Number(row.revenue) }));
    loading = false;
  });
</script>
\`\`\`

## Data and query rules

- Read only tables declared in \`queryloom.yaml\`.
- Use an independent query for each independently rendered section.
- Keep the page structure visible while a section loads; show a local skeleton or loading state instead of replacing the whole page.
- Normalize values before display: \`Number(row.revenue)\`, \`String(row.month)\`.
- Format dates and generate missing time buckets in SQL for continuous time-series charts.

## State and charts

- Use Svelte 5 runes (\`$state\`, \`$derived\`) for dashboard state and derived values. Use local state for filters in v0; shareable URL state is not available yet.
- Use LayerCake for standard SVG charts and \`d3-scale\` where a scale is needed.

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
