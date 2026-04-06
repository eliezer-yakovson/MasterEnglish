interface MetricCardProps {
  label: string;
  value: number;
  color: "red" | "green" | "orange";
}

export default function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <div className={`metric-box color-${color}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}
