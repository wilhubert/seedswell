"use client";

import { track } from "@vercel/analytics";

// The landing page is a server component, so the hero's join button gets
// this small client wrapper purely to fire the Vercel Analytics event —
// the event is the soft-launch funnel's middle step, between page views
// and registrations. The target is decided server-side: GitHub-linked
// accounts go straight to launching, everyone else to registration.
export default function JoinSwellButton({ href }: { href: string }) {
  return (
    <a
      className="btn btn--join"
      href={href}
      onClick={() => track("join_the_swell")}
    >
      Start my countdown
    </a>
  );
}
