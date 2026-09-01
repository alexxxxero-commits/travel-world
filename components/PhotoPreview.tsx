"use client";

import { useEffect, useState } from "react";

type PhotoPreviewProps = {
  src: string;
  alt: string;
};

export default function PhotoPreview({
  src,
  alt,
}: PhotoPreviewProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    // Prevent background scrolling while preview is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-2xl bg-white/5 text-left"
        aria-label={`Preview ${alt}`}
      >
        <img
          src={src}
          alt={alt}
          className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition duration-300 group-hover:bg-black/30">
          <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs tracking-widest text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:opacity-100">
            VIEW
          </span>
        </div>
      </button>

      {/* Fullscreen Preview */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-6 top-6 z-[110] flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xl text-white/70 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
            aria-label="Close preview"
          >
            ×
          </button>

          {/* Image */}
          <img
            src={src}
            alt={alt}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}