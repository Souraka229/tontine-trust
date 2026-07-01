interface ProgressBarProps {
  value: number;
  className?: string;
  color?: "green" | "blue" | "amber" | "purple" | "red";
}

const colorMap = {
  green: "bg-[hsl(var(--tc-green))]",
  blue: "bg-[hsl(var(--tc-blue))]",
  amber: "bg-[hsl(var(--tc-amber))]",
  purple: "bg-[hsl(var(--tc-purple))]",
  red: "bg-[hsl(var(--tc-red))]",
};

export default function ProgressBar({ value, className = "", color = "green" }: ProgressBarProps) {
  return (
    <div className={`h-1.5 rounded-full bg-muted overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorMap[color]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}