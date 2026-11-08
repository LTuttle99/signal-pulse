import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Observation } from "../shared/pulse";
export default function EconomicChart({ data }: { data: Observation[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="economic-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#4169e1" stopOpacity={0.4} />
            <stop offset="1" stopColor="#4169e1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#252d40" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#a5adbf", fontSize: 11 }}
          minTickGap={45}
        />
        <YAxis
          tick={{ fill: "#a5adbf", fontSize: 11 }}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{ background: "#101723", border: "1px solid #30415e" }}
        />
        <Area
          dataKey="value"
          stroke="#4169e1"
          fill="url(#economic-fill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
