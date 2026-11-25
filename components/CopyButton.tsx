"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
};

// Copies its text to the clipboard and flashes "copied!" for a moment —
// the webhook URL and secret are otherwise selected and retyped by hand.
export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked (permissions, insecure origin);
      // the value stays visible next to the button so it can be typed out.
    }
  }

  return (
    <button type="button" className="copy-btn" onClick={copy}>
      {copied ? "copied!" : "copy"}
    </button>
  );
}
