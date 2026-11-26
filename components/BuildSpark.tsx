"use client";

import { useState } from "react";

export type SparkDay = {
  // "08 Nov" — the UTC day label, matching the board's stamps.
  day: string;
  commits: number;
  // True on the day a shipped seed ended its run.
  shipped: boolean;
};

// The build log as a graph: one column per UTC day of the bet, hover
// (or tap) a column for that day's commit count. The columns are
// full-height hit areas; the visible bar sits at the bottom.
export default function BuildSpark({
  days,
  totalCommits,
}: {
  days: SparkDay[];
  totalCommits: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.commits));

  const ariaLabel = days.some((d) => d.shipped)
    ? `Shipped · ${totalCommits} commits over ${days.length} days`
    : `${totalCommits} commits over ${days.length} days`;

  return (
    <div
      className="build-spark"
      role="img"
      aria-label={ariaLabel}
      onMouseLeave={() => setHovered(null)}
    >
      {days.map((entry, index) => (
        <span
          key={entry.day}
          className="build-spark__col"
          onMouseEnter={() => setHovered(index)}
        >
          {hovered === index && (
            <span className="build-spark__tip">
              {entry.shipped
                ? `shipped · ${entry.day}`
                : `${entry.commits} ${
                    entry.commits === 1 ? "commit" : "commits"
                  } · ${entry.day}`}
            </span>
          )}
          <span
            className={`build-spark__bar${
              entry.commits === 0 ? " build-spark__bar--empty" : ""
            }${entry.shipped ? " build-spark__bar--shipped" : ""}`}
            style={
              entry.commits === 0
                ? undefined
                : {
                    height: `${
                      entry.shipped
                        ? Math.max(12, (entry.commits / max) * 44)
                        : Math.max(6, (entry.commits / max) * 44)
                    }px`,
                  }
            }
          />
        </span>
      ))}
    </div>
  );
}
