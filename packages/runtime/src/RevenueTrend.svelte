<script lang="ts">
  import { LayerCake, Svg } from "layercake";
  import { scalePoint } from "d3-scale";
  import RevenueTrendAxes from "./RevenueTrendAxes.svelte";
  import RevenueTrendLine from "./RevenueTrendLine.svelte";

  interface RevenuePoint {
    month: string;
    revenue: number;
  }

  interface Props {
    data?: readonly RevenuePoint[];
    height?: number;
  }

  let { data = [], height = 300 }: Props = $props();

  const padding = { top: 18, right: 22, bottom: 42, left: 58 };
</script>

<div class="chart" style={`height: ${height}px;`} aria-label="Revenue trend chart">
  <LayerCake
    {data}
    x="month"
    y="revenue"
    xScale={scalePoint().padding(0.35)}
    {padding}
  >
    <Svg>
      <RevenueTrendAxes />
      <RevenueTrendLine />
    </Svg>
  </LayerCake>
</div>

<style>
  .chart { position: relative; width: 100%; }
</style>
