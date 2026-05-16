"use client";

import * as React from "react";
import type { RatePoint } from "@/types";

export interface SparklineProps {
  data: RatePoint[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}

function Sparkline({
  data,
  width = 220,
  height = 56,
  strokeWidth = 1.75,
  className,
  ariaLabel = "Trend over time",
}: SparklineProps) {
  const points = React.useMemo(
    () =>
      (data ?? [])
        .filter(
          (p) => p && typeof p.value === "number" && Number.isFinite(p.value)
        )
        .slice(),
    [data]
  );

  if (points.length < 2) {
    return (
      <div
        className={className}
        style={{ width, height }}
        aria-label={ariaLabel}
        role="img"
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="hsl(var(--muted-foreground) / 0.3)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        </svg>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padY = 4;
  const innerH = height - padY * 2;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((p, i) => {
    const x = i * step;
    const y = padY + innerH - ((p.value - min) / range) * innerH;
    return { x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    `M ${coords[0].x.toFixed(2)} ${height} ` +
    coords
      .map((c) => `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
      .join(" ") +
    ` L ${coords[coords.length - 1].x.toFixed(2)} ${height} Z`;

  const gradientId = React.useId();
  const last = coords[coords.length - 1];

  return (
    <div
      className={className}
      style={{ width, height }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0.25}
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={last.x}
          cy={last.y}
          r={2.5}
          fill="hsl(var(--primary))"
        />
      </svg>
    </div>
  );
}

export { Sparkline };
export default Sparkline;
