<script lang="ts">
  import { onMount } from "svelte";
  import { LineChart, Spline } from "layerchart";
  import { query } from "@queryloom/library";

  type RegionRow = { region: string };
  type RevenueRow = { month: string; revenue: number };
  type SummaryRow = { totalRevenue: number; averageMonthlyRevenue: number; latestMonth: string; latestMonthRevenue: number };

  let selectedRegion = $state("All regions");
  let regions = $state<string[]>([]);
  let trendRows = $state<RevenueRow[]>([]);
  let summary = $state<SummaryRow | null>(null);
  let regionLoading = $state(true);
  let trendLoading = $state(true);
  let summaryLoading = $state(true);
  let regionError = $state("");
  let trendError = $state("");
  let summaryError = $state("");
  let reducedMotion = $state(false);

  const scopeLabel = $derived(selectedRegion === "All regions" ? "All regions" : selectedRegion);
  const hasTrendData = $derived(trendRows.length > 0);
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  function whereClauseFor(region: string) {
    return region === "All regions" ? "" : `WHERE region = '${region.replaceAll("'", "''")}'`;
  }

  async function loadRegions() {
    regionLoading = true;
    regionError = "";
    try {
      regions = (await query<RegionRow>("SELECT DISTINCT region FROM revenue ORDER BY region")).map((row) => String(row.region));
    } catch (error) {
      regionError = error instanceof Error ? error.message : "Unable to load regions.";
    } finally {
      regionLoading = false;
    }
  }

  async function loadTrend(region: string) {
    trendLoading = true;
    trendError = "";
    try {
      const result = await query<RevenueRow>(`SELECT month, SUM(revenue)::DOUBLE AS revenue FROM revenue ${whereClauseFor(region)} GROUP BY month ORDER BY month`);
      trendRows = result.map((row) => ({ month: String(row.month), revenue: Number(row.revenue) }));
    } catch (error) {
      trendError = error instanceof Error ? error.message : "Unable to load the trend.";
      trendRows = [];
    } finally {
      trendLoading = false;
    }
  }

  async function loadSummary(region: string) {
    summaryLoading = true;
    summaryError = "";
    try {
      const result = await query<SummaryRow>(`WITH monthly AS (SELECT month, SUM(revenue)::DOUBLE AS revenue FROM revenue ${whereClauseFor(region)} GROUP BY month), ranked AS (SELECT month, revenue, ROW_NUMBER() OVER (ORDER BY month DESC) AS row_number FROM monthly) SELECT SUM(revenue)::DOUBLE AS totalRevenue, AVG(revenue)::DOUBLE AS averageMonthlyRevenue, MAX(CASE WHEN row_number = 1 THEN month END) AS latestMonth, MAX(CASE WHEN row_number = 1 THEN revenue END)::DOUBLE AS latestMonthRevenue FROM ranked`);
      const row = result[0];
      summary = row ? { totalRevenue: Number(row.totalRevenue), averageMonthlyRevenue: Number(row.averageMonthlyRevenue), latestMonth: String(row.latestMonth), latestMonthRevenue: Number(row.latestMonthRevenue) } : null;
    } catch (error) {
      summaryError = error instanceof Error ? error.message : "Unable to load the summary.";
      summary = null;
    } finally {
      summaryLoading = false;
    }
  }

  function refreshMetrics(region: string) { void loadTrend(region); void loadSummary(region); }
  function handleRegionChange(event: Event) {
    const region = (event.currentTarget as HTMLSelectElement).value;
    selectedRegion = region;
    refreshMetrics(region);
  }
  onMount(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => { reducedMotion = mediaQuery.matches; };
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    void loadRegions();
    refreshMetrics(selectedRegion);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  });
</script>

<svelte:head><title>Revenue pulse</title><meta name="description" content="A region-scoped monthly revenue dashboard." /></svelte:head>

<main class="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8 lg:px-12">
  <div class="mx-auto max-w-6xl">
    <header class="mb-8 flex flex-col gap-5 border-b border-slate-800 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div><p class="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Revenue pulse</p><h1 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl">How is monthly revenue trending by region?</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Monthly revenue is summed by month. The region selection consistently scopes the KPI summary and trend.</p></div>
      <label class="grid gap-2 text-sm font-medium text-slate-300">Region
        <select bind:value={selectedRegion} onchange={handleRegionChange} disabled={regionLoading} class="min-w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-wait disabled:opacity-60"><option>All regions</option>{#each regions as region}<option value={region}>{region}</option>{/each}</select>
      </label>
    </header>

    {#if regionError}<section class="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100" aria-live="polite">Region choices could not be loaded: {regionError}</section>{/if}
    <section class="grid gap-4 sm:grid-cols-3" aria-label="Revenue KPIs">
      {#if summaryLoading}
        {#each ["Total revenue", "Average monthly revenue", "Latest month"] as label}<article class="animate-pulse rounded-xl border border-slate-800 bg-slate-900 p-5"><p class="text-sm text-slate-400">{label}</p><div class="mt-3 h-8 w-32 rounded bg-slate-800"></div></article>{/each}
      {:else if summaryError}
        <article class="sm:col-span-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-5 text-rose-100"><h2 class="font-semibold">Revenue KPIs could not be loaded</h2><p class="mt-1 text-sm text-rose-200">{summaryError}</p></article>
      {:else if !summary}
        <article class="sm:col-span-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-5 text-sm text-slate-400">No KPI data is available for {scopeLabel}.</article>
      {:else}
        <article class="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><p class="text-sm text-slate-400">Total revenue</p><p class="mt-2 text-2xl font-semibold text-white">{number.format(summary.totalRevenue)}</p><p class="mt-2 text-xs text-slate-500">All available months · {scopeLabel}</p></article>
        <article class="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><p class="text-sm text-slate-400">Average monthly revenue</p><p class="mt-2 text-2xl font-semibold text-white">{number.format(summary.averageMonthlyRevenue)}</p><p class="mt-2 text-xs text-slate-500">Monthly summed revenue · {scopeLabel}</p></article>
        <article class="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"><p class="text-sm text-slate-400">Latest month · {summary.latestMonth}</p><p class="mt-2 text-2xl font-semibold text-white">{number.format(summary.latestMonthRevenue)}</p><p class="mt-2 text-xs text-slate-500">Latest sortable month · {scopeLabel}</p></article>
      {/if}
    </section>

    <section class="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <div class="mb-5 flex items-start justify-between gap-4"><div><h2 class="text-lg font-semibold text-white">Monthly revenue trend</h2><p class="mt-1 text-sm text-slate-400">{scopeLabel} · monthly summed revenue</p></div><span class="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">SUM(revenue)</span></div>
      {#if trendLoading}<div class="h-80 animate-pulse rounded-lg bg-slate-800/70" aria-live="polite"></div>
      {:else if trendError}<div class="grid h-80 place-items-center rounded-lg border border-rose-500/40 bg-rose-500/10 p-5 text-center text-sm text-rose-100" aria-live="polite">The chart could not be loaded: {trendError}</div>
      {:else if !hasTrendData}<div class="grid h-80 place-items-center rounded-lg border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">No monthly revenue data is available for {scopeLabel}.</div>
      {:else}<div class="h-80" aria-label="Monthly revenue line chart"><LineChart data={trendRows} x="month" y="revenue" yDomain={[0, null]} height={320} points>{#snippet marks()}<Spline seriesKey="revenue" draw={reducedMotion ? false : { duration: 350 }} />{/snippet}</LineChart></div>{/if}
    </section>
    <aside class="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100/80"><span class="font-semibold text-amber-100">Caveat:</span> The source has six month-like strings, two region labels, and no currency or business-definition metadata. Revenue is presented as source units; verify currency and whether each row is a complete monthly total before financial use.</aside>
  </div>
</main>
