<script lang="ts">
  import { getContext } from "svelte";

  type Point = { month: string; revenue: number };
  type LayerCakeContext = {
    data: { subscribe: (run: (value: Point[]) => void) => () => void };
    xGet: { subscribe: (run: (value: (point: Point) => number) => void) => () => void };
    yScale: { subscribe: (run: (value: { ticks: (count: number) => number[]; (value: number): number }) => void) => () => void };
    width: { subscribe: (run: (value: number) => void) => () => void };
    height: { subscribe: (run: (value: number) => void) => () => void };
  };

  const { data, xGet, yScale, width, height } = getContext("LayerCake") as LayerCakeContext;
  const formatRevenue = (value: number) => `$${Math.round(value / 1000)}k`;
</script>

{#each $yScale.ticks(4) as tick (tick)}
  <g class="y-tick" transform={`translate(0, ${$yScale(tick)})`}>
    <line x1="0" x2={$width} />
    <text x="-10" y="4" text-anchor="end">{formatRevenue(tick)}</text>
  </g>
{/each}

{#each $data as point, index (point.month)}
  <text class="x-label" x={$xGet(point)} y={$height + 28} text-anchor="middle">{point.month}</text>
  {#if index > 0}
    <line class="x-guide" x1={$xGet(point)} x2={$xGet(point)} y1="0" y2={$height} />
  {/if}
{/each}

<style>
  .y-tick line { stroke: #e5eaf3; stroke-width: 1; }
  .y-tick text, .x-label { fill: #7b879f; font-size: 11px; }
  .x-guide { stroke: #f0f3f8; stroke-width: 1; }
</style>
