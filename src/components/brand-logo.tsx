import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  inverted?: boolean;
  priority?: boolean;
};

export function BrandLogo({
  className,
  inverted = false,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      className={className}
      src={inverted ? "/brand/nexusti-logo-inverted.png" : "/brand/nexusti-logo.png"}
      alt="NexusTI"
      width={777}
      height={206}
      priority={priority}
      unoptimized
    />
  );
}
