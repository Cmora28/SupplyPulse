import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M21.76 10.24C8.32 10.24 8.32 16 16 16C23.68 16 23.68 21.76 10.24 21.76"
        stroke="white"
        strokeWidth="3.84"
        strokeLinecap="round"
      />
    </svg>
  );
}
