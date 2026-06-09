import { cn } from "@/lib/utils";

type CountryFlagProps = {
  iso: string;
  className?: string;
  size?: "sm" | "md";
};

/** Renders a country flag image (works on Windows; emoji flags often show as "IN", "US", etc.). */
export function CountryFlag({ iso, className, size = "md" }: CountryFlagProps) {
  const code = iso.toLowerCase().replace(/[^a-z]/g, "");
  const width = size === "sm" ? 20 : 24;
  const height = size === "sm" ? 15 : 18;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${width}x${height}/${code}.png`}
      srcSet={`https://flagcdn.com/${width * 2}x${height * 2}/${code}.png 2x`}
      width={width}
      height={height}
      alt=""
      aria-hidden
      loading="lazy"
      className={cn(
        "inline-block shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.08)]",
        className
      )}
    />
  );
}
