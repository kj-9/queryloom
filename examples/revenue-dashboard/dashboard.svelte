<script lang="ts">
  import { onMount } from "svelte";
  import { query, RevenueTrend } from "@queryloom/runtime";

  type TrendRow = { month: string; revenue: number };
  type SummaryRow = { revenue: number; previous_revenue: number; months: number };
  type RegionRow = { region: string };

  let regions = $state<string[]>([]);
  let selectedRegion = $state("All regions");
  let trend = $state<TrendRow[]>([]);
  let summary = $state<SummaryRow | null>(null);
  let trendLoading = $state(true);
  let summaryLoading = $state(true);
  let trendError = $state("");
  let summaryError = $state("");
  let requestVersion = 0;

  const whereClause = $derived(
    selectedRegion === "All regions"
      ? ""
      : `WHERE region = '${selectedRegion.replaceAll("'", "''")}'`
  );
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
  const percentage = $derived(
    summary && summary.previous_revenue > 0
      ? ((summary.revenue - summary.previous_revenue) / summary.previous_revenue) * 100
      : null
  );
  const latestPoint = $derived(trend.at(-1));

  async function loadRegions() {
    try {
      const result = await query<RegionRow>(`SELECT DISTINCT region FROM revenue ORDER BY region`);
      regions = result.map((row) => String(row.region));
    } catch {
      regions = [];
    }
  }

  async function loadDashboard() {
    const version = ++requestVersion;
    trendLoading = true;
    summaryLoading = true;
    trendError = "";
    summaryError = "";

    const trendSql = `
      WITH months AS (
        SELECT month_start
        FROM generate_series(DATE '2026-01-01', DATE '2026-06-01', INTERVAL 1 MONTH) AS t(month_start)
      ), monthly_revenue AS (
        SELECT CAST(month || '-01' AS DATE) AS month_start, SUM(revenue)::DOUBLE AS revenue
        FROM revenue
        ${whereClause}
        GROUP BY 1
      )
      SELECT strftime(months.month_start, '%b') AS month,
             COALESCE(monthly_revenue.revenue, 0)::DOUBLE AS revenue
      FROM months
      LEFT JOIN monthly_revenue USING (month_start)
      ORDER BY months.month_start
    `;
    const summarySql = `
      WITH monthly_revenue AS (
        SELECT CAST(month || '-01' AS DATE) AS month_start, SUM(revenue)::DOUBLE AS revenue
        FROM revenue
        ${whereClause}
        GROUP BY 1
      )
      SELECT COALESCE(SUM(revenue), 0)::DOUBLE AS revenue,
             COALESCE(SUM(CASE WHEN month_start < DATE '2026-04-01' THEN revenue ELSE 0 END), 0)::DOUBLE AS previous_revenue,
             COUNT(*)::INTEGER AS months
      FROM monthly_revenue
    `;

    const [trendResult, summaryResult] = await Promise.allSettled([
      query<TrendRow>(trendSql),
      query<SummaryRow>(summarySql)
    ]);
    if (version !== requestVersion) return;

    if (trendResult.status === "fulfilled") {
      trend = trendResult.value.map((row) => ({ month: String(row.month), revenue: Number(row.revenue) }));
    } else {
      trend = [];
      trendError = "The revenue trend could not be loaded.";
    }
    if (summaryResult.status === "fulfilled") {
      const row = summaryResult.value[0];
      summary = row
        ? { revenue: Number(row.revenue), previous_revenue: Number(row.previous_revenue), months: Number(row.months) }
        : null;
    } else {
      summary = null;
      summaryError = "The revenue summary could not be loaded.";
    }
    trendLoading = false;
    summaryLoading = false;
  }

  onMount(() => {
    void loadRegions();
    void loadDashboard();
  });

  function changeRegion(region: string) {
    selectedRegion = region;
    void loadDashboard();
  }
</script>

<svelte:head>
  <title>Revenue pulse</title>
  <meta name="description" content="A six-month local revenue trend." />
</svelte:head>

<main class="min-h-screen bg-[#f8f8f8] px-4 py-7 text-[#231f20] sm:px-8 sm:py-10">
  <section class="mx-auto max-w-4xl">
    <header class="flex flex-col gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0777b3]">Revenue pulse · 2026</p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Is revenue gaining momentum?</h1>
        <p class="mt-2 max-w-xl text-sm leading-6 text-[#6a6a6a]">Monthly revenue through June, compared with the first quarter baseline.</p>
      </div>
      <div class="flex flex-wrap gap-2" aria-label="Region filter">
        {#each ["All regions", ...regions] as region (region)}
          <button
            type="button"
            class:active={selectedRegion === region}
            class="rounded-full border border-black/15 px-3 py-1.5 text-sm font-medium transition hover:border-[#0777b3] hover:text-[#0777b3]"
            onclick={() => changeRegion(region)}
            aria-pressed={selectedRegion === region}
          >{region}</button>
        {/each}
      </div>
    </header>

    <div class="grid gap-4 border-b border-black/10 py-5 sm:grid-cols-3 sm:gap-0">
      <div class="sm:border-r sm:border-black/10 sm:pr-6">
        <p class="text-xs font-medium uppercase tracking-[0.12em] text-[#6a6a6a]">Six-month revenue</p>
        {#if summaryLoading}<div class="mt-2 h-8 w-28 animate-pulse rounded bg-black/10"></div>
        {:else if summaryError}<p class="mt-2 text-sm text-[#bc1200]">{summaryError}</p>
        {:else}<p class="mt-1 text-2xl font-semibold tracking-tight">{formatCompact(summary?.revenue ?? 0)}</p>{/if}
      </div>
      <div class="sm:border-r sm:border-black/10 sm:px-6">
        <p class="text-xs font-medium uppercase tracking-[0.12em] text-[#6a6a6a]">June run rate</p>
        {#if trendLoading}<div class="mt-2 h-8 w-24 animate-pulse rounded bg-black/10"></div>
        {:else if trendError}<p class="mt-2 text-sm text-[#bc1200]">Unavailable</p>
        {:else}<p class="mt-1 text-2xl font-semibold tracking-tight">{formatCompact(latestPoint?.revenue ?? 0)}</p>{/if}
      </div>
      <div class="sm:pl-6">
        <p class="text-xs font-medium uppercase tracking-[0.12em] text-[#6a6a6a]">Q2 vs. Q1</p>
        {#if summaryLoading}<div class="mt-2 h-8 w-20 animate-pulse rounded bg-black/10"></div>
        {:else if percentage !== null}<p class="mt-1 text-2xl font-semibold tracking-tight text-[#2d7a00]">+{percentage.toFixed(1)}%</p>
        {:else}<p class="mt-1 text-2xl font-semibold tracking-tight">—</p>{/if}
      </div>
    </div>

    <article class="mt-6 rounded-xl border border-black/10 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0_/_0.03)] sm:p-6">
      <div class="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 class="font-semibold">Monthly revenue</h2>
          <p class="mt-1 text-sm text-[#6a6a6a]">{selectedRegion} · January–June</p>
        </div>
        {#if latestPoint && !trendLoading}<p class="hidden text-right text-sm text-[#6a6a6a] sm:block">June<br /><span class="font-medium text-[#231f20]">{formatCurrency(latestPoint.revenue)}</span></p>{/if}
      </div>
      {#if trendLoading}
        <div class="h-[300px] animate-pulse rounded-lg bg-[linear-gradient(110deg,#f3f4f6,45%,#fafafa,55%,#f3f4f6)]"></div>
      {:else if trendError}
        <div class="flex h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-[#bc1200]/30 bg-[#bc1200]/5 text-center">
          <p class="font-medium text-[#bc1200]">{trendError}</p>
          <button type="button" class="mt-3 text-sm font-semibold text-[#0777b3] underline underline-offset-4" onclick={() => void loadDashboard()}>Try again</button>
        </div>
      {:else if trend.length === 0}
        <div class="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-black/15 text-sm text-[#6a6a6a]">No revenue data for this selection.</div>
      {:else}
        <RevenueTrend data={trend} height={300} />
      {/if}
    </article>
  </section>
</main>

<style>
  button.active { background: #0777b3; border-color: #0777b3; color: white; }
</style>
