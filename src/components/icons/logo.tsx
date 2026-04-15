import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-primary", className)}
      {...props}
    >
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 2A10 10 0 1 0 22 12" />
      <path d="M12 2a10 10 0 0 0 10 10" />
      <path d="M2 12a10 10 0 0 0 10 10" />
      <path d="M12 2A10 10 0 0 1 22 12" />
      <path d="M2 12a10 10 0 0 1 10-10" />
      <path d="M15.5 8.5 18 6l-2.5-2.5" />
      <path d="m14 10 3-3" />
      <path d="M12.019 4.312A8.001 8.001 0 0 0 4.312 12.02" />
    </svg>
  );
}
