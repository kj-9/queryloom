<script lang="ts">
  import { onMount } from "svelte";
  import { LineChart, Spline } from "layerchart";
  import { query } from "@queryloom/library";

  type RegionRow = { region: string };
  type SummaryRow = {
    totalRevenue: number;
    averageMonthlyRevenue: number;
    latestMonthRevenue: number;
    previousMonthRevenue: number;
  };
  type MonthlyRevenueRow = { month: string; revenue: number };

  let regions = $state<string[]>([]);
  let selectedRegion = $state("All regions");
  let summary = $state<SummaryRow | null>(null);
  let monthlyRevenue = $state<MonthlyRevenueRow[]>([]);
  let regionsLoading = $state(true);
  let summaryLoading = $state(true);
  let chartLoading = $state(true);
  let regionsError = $state<string | null>(null);
  let summaryError = $state<string | null>(null);
  let chartError = $state<string | null>(null);
  let reducedMotion = $state(false);
  let requestId = 0;

  let scopeLabel = $derived(selectedRegion === "All regions" ? "All regions" : selectedRegion);

  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const percent = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "always",
  });

  function filterClause() {
    if (selectedRegion === "All regions") return "";
    return `WHERE region = '${selectedRegion.replaceAll("'", "''")}'`;
  }

  function monthlyChange() {
    if (!summary || summary.previousMonthRevenue <= 0) return null;
    return (summary.latestMonthRevenue - summary.previousMonthRevenue) / summary.previousMonthRevenue;
  }

  function selectedScopeSql() {
    return `
      WITH filtered AS (
        SELECT month, revenue
        FROM revenue
        ${filterClause()}
      )
    `;
  }

  async function loadSummary(currentRequest: number) {
    summaryLoading = true;
    summaryError = null;

    try {
      const rows = await query<MonthlyRevenueRow>(`
        ${selectedScopeSql()}
        SELECT month, SUM(revenue)::DOUBLE AS revenue
        FROM filtered
        GROUP BY month
        ORDER BY month
      `);

      if (currentRequest === requestId) {
        const monthlyRows = rows.map((row) => Number(row.revenue));
        const latestMonthRevenue = monthlyRows[monthlyRows.length - 1] ?? 0;
        const previousMonthRevenue = monthlyRows[monthlyRows.length - 2] ?? 0;
        summary = monthlyRows.length
          ? {
              totalRevenue: monthlyRows.reduce((total, revenue) => total + revenue, 0),
              averageMonthlyRevenue: monthlyRows.reduce((total, revenue) => total + revenue, 0) / monthlyRows.length,
              latestMonthRevenue,
              previousMonthRevenue,
            }
          : null;
      }
    } catch (error) {
      if (currentRequest === requestId) {
        summary = null;
        summaryError = error instanceof Error ? error.message : "Unable to load revenue summary.";
      }
    } finally {
      if (currentRequest === requestId) summaryLoading = false;
    }
  }

  async function loadChart(currentRequest: number) {
    chartLoading = true;
    chartError = null;

    try {
      const rows = await query<MonthlyRevenueRow>(`
        ${selectedScopeSql()}
        SELECT month, SUM(revenue)::DOUBLE AS revenue
        FROM filtered
        GROUP BY month
        ORDER BY month
      `);

      if (currentRequest === requestId) {
        monthlyRevenue = rows.map((row) => ({
          month: String(row.month),
          revenue: Number(row.revenue),
        }));
      }
    } catch (error) {
      if (currentRequest === requestId) {
        monthlyRevenue = [];
        chartError = error instanceof Error ? error.message : "Unable to load monthly revenue.";
      }
    } finally {
      if (currentRequest === requestId) chartLoading = false;
    }
  }

  function loadDashboard() {
    requestId += 1;
    const currentRequest = requestId;
    void loadSummary(currentRequest);
    void loadChart(currentRequest);
  }

  function selectRegion(event: Event) {
    selectedRegion = (event.currentTarget as HTMLSelectElement).value;
    loadDashboard();
  }

  onMount(async () => {
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      const rows = await query<RegionRow>(`
        SELECT DISTINCT region
        FROM revenue
        ORDER BY region
      `);
      regions = rows.map((row) => String(row.region));
    } catch (error) {
      regionsError = error instanceof Error ? error.message : "Unable to load regions.";
    } finally {
      regionsLoading = false;
    }

    loadDashboard();
  });
</script>

<svelte:head>
  <title>Revenue pulse</title>
  <meta name="description" content="A compact, browser-local view of monthly revenue by region." />
</svelte:head>

<main class="min-h-screen bg-[#f8f8f8] px-4 py-6 text-[#231f20] sm:px-6 lg:px-8">
  <div class="mx-auto max-w-6xl">
    <header class="flex flex-col gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#0777b3]">Revenue monitor</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Monthly revenue pulse</h1>
        <p class="mt-2 max-w-xl text-sm leading-6 text-[#6a6a6a]">Revenue is aggregated in your browser from the local source declared for this dashboard.</p>
      </div>

      <label class="grid gap-1.5 text-sm font-medium" for="region">
        <span class="text-[#6a6a6a]">Region</span>
        <select
          id="region"
          class="min-w-44 rounded-md border border-black/15 bg-white px-3 py-2 text-[#231f20] shadow-sm outline-none transition focus:border-[#0777b3] focus:ring-2 focus:ring-[#0777b3]/20 disabled:cursor-not-allowed disabled:bg-black/5"
          disabled={regionsLoading || Boolean(regionsError)}
          value={selectedRegion}
          onchange={selectRegion}
        >
          <option value="All regions">All regions</option>
          {#each regions as region (region)}
            <option value={region}>{region}</option>
          {/each}
        </select>
        {#if regionsError}
          <span class="text-xs font-normal text-[#bc1200]">Region filter unavailable</span>
        {/if}
      </label>
    </header>

    <section class="grid gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10 sm:grid-cols-3" aria-label="Revenue summary">
      {#if summaryLoading}
        {#each Array(3) as _}
          <div class="min-h-32 animate-pulse bg-white p-5"><div class="h-3 w-20 rounded bg-black/10"></div><div class="mt-5 h-8 w-32 rounded bg-black/10"></div></div>
        {/each}
      {:else if summaryError}
        <div class="col-span-full bg-white p-5 text-sm text-[#bc1200]"><span class="font-semibold">Summary unavailable.</span> {summaryError}</div>
      {:else if summary}
        <div class="bg-white p-5">
          <p class="text-sm text-[#6a6a6a]">Total revenue</p>
          <p class="mt-3 text-2xl font-semibold tracking-tight">{currency.format(summary.totalRevenue)}</p>
          <p class="mt-2 text-xs text-[#6a6a6a]">Across all available months · {scopeLabel}</p>
        </div>
        <div class="bg-white p-5">
          <p class="text-sm text-[#6a6a6a]">Monthly average</p>
          <p class="mt-3 text-2xl font-semibold tracking-tight">{currency.format(summary.averageMonthlyRevenue)}</p>
          <p class="mt-2 text-xs text-[#6a6a6a]">Average monthly revenue · {scopeLabel}</p>
        </div>
        <div class="bg-white p-5">
          <p class="text-sm text-[#6a6a6a]">Latest month</p>
          <p class="mt-3 text-2xl font-semibold tracking-tight">{currency.format(summary.latestMonthRevenue)}</p>
          <p class="mt-2 text-xs text-[#6a6a6a]">
            {#if monthlyChange() === null}
              No prior month to compare
            {:else}
              {percent.format(monthlyChange() ?? 0)} vs. previous month · {scopeLabel}
            {/if}
          </p>
        </div>
      {:else}
        <div class="col-span-full bg-white p-5 text-sm text-[#6a6a6a]">No revenue records match this region.</div>
      {/if}
    </section>

    <section class="mt-6 rounded-lg border border-black/10 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="trend-title">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 id="trend-title" class="text-lg font-semibold tracking-tight">Revenue trend</h2>
          <p class="mt-1 text-sm text-[#6a6a6a]">Monthly revenue for {scopeLabel}.</p>
        </div>
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-[#6a6a6a]">USD</p>
      </div>

      <div class="mt-5" aria-busy={chartLoading}>
        {#if chartLoading}
          <div class="h-80 animate-pulse rounded-md bg-black/[0.04]"></div>
        {:else if chartError}
          <div class="flex h-80 items-center justify-center rounded-md border border-dashed border-[#bc1200]/40 bg-[#bc1200]/[0.03] px-6 text-center text-sm text-[#bc1200]"><span><span class="font-semibold">Trend unavailable.</span> {chartError}</span></div>
        {:else if monthlyRevenue.length === 0}
          <div class="flex h-80 items-center justify-center rounded-md border border-dashed border-black/15 px-6 text-center text-sm text-[#6a6a6a]">No monthly revenue is available for this region.</div>
        {:else}
          {#key `${selectedRegion}-${monthlyRevenue.length}`}
            <LineChart
              data={monthlyRevenue}
              x="month"
              y="revenue"
              yDomain={[0, null]}
              height={320}
              points
              tooltipContext
              series={[{ key: "revenue", color: "#0777b3" }]}
            >
              {#snippet marks()}
                <Spline seriesKey="revenue" strokeWidth={3} draw={reducedMotion ? false : { duration: 360 }} />
              {/snippet}
            </LineChart>
          {/key}
        {/if}
      </div>
    </section>
  </div>
</main>
