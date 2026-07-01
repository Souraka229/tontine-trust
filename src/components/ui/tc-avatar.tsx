import type { FC } from "react";

const colorMap = {
  green: "bg-[hsla(160,84%,39%,0.12)] text-[hsl(var(--tc-green))]",
  blue: "bg-[hsla(217,91%,60%,0.12)] text-[hsl(var(--tc-blue))]",
  amber: "bg-[hsla(38,92%,50%,0.12)] text-[hsl(var(--tc-amber))]",
  purple: "bg-[hsla(258,90%,66%,0.12)] text-[hsl(var(--tc-purple))]",
  red: "bg-[hsla(0,84%,60%,0.12)] text-[hsl(var(--tc-red))]",
};

interface AvatarProps {
  initials: string;
  color: keyof typeof colorMap;
  size?: "sm" | "md" | "lg";
}

const TCAvatar: FC<AvatarProps> = ({ initials, color, size = "md" }) => {
  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-xl",
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${colorMap[color]} ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  );
};

export default TCAvatar;