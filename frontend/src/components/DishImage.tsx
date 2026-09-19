import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dish photo with a neutral "no photo" placeholder — never a random stock dish,
 * so the cook is never shown a picture of the wrong food.
 */
export default function DishImage({
  src,
  alt,
  className,
  testid = "dish-image",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  testid?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  if (!src || broken) {
    return (
      <div
        data-testid={`${testid}-placeholder`}
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-[#EDE6D8] text-[#8A8071] dark:bg-[#2A2A24] dark:text-[#9C9486]",
          className,
        )}
      >
        <ImageOff className="h-6 w-6" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">No photo</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      data-testid={testid}
      onError={() => setBroken(true)}
      className={cn("object-cover", className)}
    />
  );
}
