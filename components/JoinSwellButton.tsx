"use client";

import { track } from "@vercel/analytics";

// The landing page is a server component, so the hero's join button gets
// this small client wrapper purely to fire the Vercel Analytics event —
// the event is the soft-launch funnel's middle step, between page views
// and registrations.
export default function JoinSwellButton() {
  return (
    <a
      className="btn btn--join"
      href="/auth/register"
      onClick={() => track("join_the_swell")}
    >
      Join the swell
    </a>
  );
}
