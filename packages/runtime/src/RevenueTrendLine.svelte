<script lang="ts">
  import { getContext } from "svelte";

  type Point = { month: string; revenue: number };
  type LayerCakeContext = {
    data: { subscribe: (run: (value: Point[]) => void) => () => void };
    xGet: { subscribe: (run: (value: (point: Point) => number) => void) => () => void };
    yGet: { subscribe: (run: (value: (point: Point) => number) => void) => () => void };
    height: { subscribe: (run: (value: number) => void) => () => void };
  };

  const { data, xGet, yGet, height } = getContext("LayerCake") as LayerCakeContext;
</script>

{#if $data.length > 0}
  {#key $data}
    <polyline
      class="area"
      points={`${$xGet($data[0])},${$height} ${$data.map((point) => `${$xGet(point)},${$yGet(point)}`).join(" ")} ${$xGet($data[$data.length - 1])},${$height}`}
    />
    <polyline class="line" points={$data.map((point) => `${$xGet(point)},${$yGet(point)}`).join(" ")} pathLength="1" />
    {#each $data as point (point.month)}
      <circle class="point" cx={$xGet(point)} cy={$yGet(point)} r="3.5" />
    {/each}
  {/key}
{/if}

<style>
  .area { fill: rgb(37 99 235 / 12%); stroke: none; }
  .line { fill: none; stroke: #2563eb; stroke-linecap: round; stroke-linejoin: round; stroke-width: 3; stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw-line 650ms cubic-bezier(.16, 1, .3, 1) forwards; }
  .point { fill: #2563eb; stroke: white; stroke-width: 2; animation: reveal-point 280ms ease-out both; }
  @keyframes draw-line { to { stroke-dashoffset: 0; } }
  @keyframes reveal-point { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) { .line, .point { animation: none; } }
</style>
