import Image from "next/image";

/**
 * Crops the transparent canvas around the selected Kathalis logo at display size.
 * The crop box is px, like the image offsets: rem would shrink it with the
 * studio's fluid root font size and clip the wordmark.
 */
export function BrandLogo() {
  return (
    <span className="relative block h-[36px] w-[96px] shrink-0 overflow-hidden">
      <Image
        src="/branding/kathalis-quote-monogram.png"
        alt="Kathalis"
        width={130}
        height={65}
        priority
        className="absolute -left-[18px] -top-[10px] max-w-none"
      />
    </span>
  );
}
