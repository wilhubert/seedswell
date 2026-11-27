"use client";

import { useRef, useState } from "react";

// The picker downscales the chosen photo in the browser before it is
// submitted: the avatar only ever renders at 162px or smaller, so a
// 400px WebP (~20-40 KB) is the full-resolution copy for every surface
// — profile card, board rows, watcher chips. That keeps both the stored
// object and every page-load's egress near-flat instead of passing a
// multi-megabyte original through a 24px <img>.
const MAX_EDGE = 400;
const WEBP_QUALITY = 0.85;

function kilobytes(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function downscale(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas 2d context unavailable");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
  );
  if (!blob) {
    // toBlob(null) means the browser cannot encode WebP; the caller
    // falls back to the original file.
    throw new Error("WebP encoding unavailable");
  }
  const resized = new File([blob], "avatar.webp", { type: "image/webp" });
  // A tiny source can grow through re-encoding — keep the original
  // when the "optimized" copy is not actually smaller.
  return resized.size < file.size ? resized : file;
}

// Both inputs are nameless-to-hidden pairs: the visible picker never
// submits anything itself. "photo" carries the downscaled display copy
// that avatar_url will point at; "photo_original" carries the untouched
// original as a cold archive — nothing ever renders it, so it costs
// storage only, and a future bigger-avatar design can re-derive from
// it. When downscaling fails (exotic format, old browser) the original
// IS the display copy, so nothing is archived twice. The server action
// re-validates type and the 2 MB bound on both files either way.
export default function AvatarPicker() {
  const photoInput = useRef<HTMLInputElement>(null);
  const originalInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const displayTransfer = new DataTransfer();
    const archiveTransfer = new DataTransfer();
    if (!file) {
      if (photoInput.current) photoInput.current.files = displayTransfer.files;
      if (originalInput.current)
        originalInput.current.files = archiveTransfer.files;
      setStatus(null);
      return;
    }
    try {
      const processed = await downscale(file);
      displayTransfer.items.add(processed);
      if (processed !== file) {
        archiveTransfer.items.add(file);
      }
      setStatus(
        processed === file
          ? file.name
          : `${file.name} — optimized to ${kilobytes(processed.size)}`,
      );
    } catch {
      displayTransfer.items.add(file);
      setStatus(`${file.name} — not optimized`);
    }
    if (photoInput.current) photoInput.current.files = displayTransfer.files;
    if (originalInput.current)
      originalInput.current.files = archiveTransfer.files;
  }

  return (
    <>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleChange}
      />
      <input ref={photoInput} type="file" name="photo" hidden />
      <input ref={originalInput} type="file" name="photo_original" hidden />
      {status && <span className="avatar-picker__status">{status}</span>}
    </>
  );
}
