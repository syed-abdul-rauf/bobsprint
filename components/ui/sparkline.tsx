interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ values, width = 80, height = 24, color = 'currentColor' }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const step = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}
