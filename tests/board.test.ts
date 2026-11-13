import test from "node:test";
import assert from "node:assert/strict";
import { boardOrder, counterLabel, type Seed } from "../lib/board.ts";

const DAY_MS = 86_400_000;

// Planted fractional days ago so no test can straddle a day boundary mid-run.
function makeSeed(overrides: Partial<Seed>): Seed {
  return {
    id: "x",
    userId: "user",
    name: "Seed",
    tagline: null,
    owner: "wil",
    avatarUrl: null,
    logoUrl: null,
    plantedAt: new Date(Date.now() - 3 * DAY_MS),
    targetDays: 30,
    pushCount: 0,
    shippedAt: null,
    cancelledAt: null,
    shipDays: null,
    connectedAt: null,
    ...overrides,
  };
}

test("counter reads day 1 with the full target still to go", () => {
  const seed = makeSeed({ plantedAt: new Date(Date.now() - 0.5 * DAY_MS) });
  assert.equal(counterLabel(seed), "day 1/30 · 30 to go");
});

test("counter reads mid-flight", () => {
  const seed = makeSeed({ plantedAt: new Date(Date.now() - 12.5 * DAY_MS) });
  assert.equal(counterLabel(seed), "day 13/30 · 18 to go");
});

test("counter reads the final day", () => {
  const seed = makeSeed({ plantedAt: new Date(Date.now() - 29.5 * DAY_MS) });
  assert.equal(counterLabel(seed), "day 30/30 · 1 to go");
});

test("counter shows how far over the date is", () => {
  const seed = makeSeed({ plantedAt: new Date(Date.now() - 30.5 * DAY_MS) });
  assert.equal(counterLabel(seed), "day 31/30 · 1 over");
});

test("counter shows the ship receipt", () => {
  const seed = makeSeed({
    shippedAt: new Date(Date.now() - 5 * DAY_MS),
    shipDays: 22,
  });
  assert.equal(counterLabel(seed), "shipped · 22 days");
});

test("counter shows a called-off seed", () => {
  const seed = makeSeed({ cancelledAt: new Date(Date.now() - DAY_MS) });
  assert.equal(counterLabel(seed), "called off");
});

test("board orders live seeds by soonest deadline", () => {
  const soon = makeSeed({
    id: "soon",
    plantedAt: new Date(Date.now() - 8 * DAY_MS),
    targetDays: 10,
  });
  const middle = makeSeed({
    id: "middle",
    plantedAt: new Date(Date.now() - 1 * DAY_MS),
    targetDays: 7,
  });
  const late = makeSeed({
    id: "late",
    plantedAt: new Date(Date.now() - 0.5 * DAY_MS),
    targetDays: 30,
  });
  assert.deepEqual(boardOrder([late, soon, middle]).map((s) => s.id), [
    "soon",
    "middle",
    "late",
  ]);
});

test("board drops a seed that never shipped after its date", () => {
  const overdue = makeSeed({
    id: "overdue",
    plantedAt: new Date(Date.now() - 35 * DAY_MS),
  });
  const live = makeSeed({ id: "live" });
  assert.deepEqual(boardOrder([overdue, live]).map((s) => s.id), ["live"]);
});

test("board drops a seed shipped after its date", () => {
  const shippedLate = makeSeed({
    id: "shipped-late",
    plantedAt: new Date(Date.now() - 35 * DAY_MS),
    shippedAt: new Date(Date.now() - 4 * DAY_MS),
    shipDays: 31,
  });
  const live = makeSeed({ id: "live" });
  assert.deepEqual(boardOrder([shippedLate, live]).map((s) => s.id), ["live"]);
});

test("board keeps a shipped seed under the live ones until its date", () => {
  const live = makeSeed({ id: "live" });
  const shipped = makeSeed({
    id: "shipped",
    plantedAt: new Date(Date.now() - 2 * DAY_MS),
    targetDays: 7,
    shippedAt: new Date(Date.now() - DAY_MS),
    shipDays: 2,
  });
  assert.deepEqual(boardOrder([shipped, live]).map((s) => s.id), [
    "live",
    "shipped",
  ]);
});

test("board drops a called-off seed even inside its window", () => {
  const cancelled = makeSeed({
    id: "cancelled",
    cancelledAt: new Date(Date.now() - DAY_MS),
  });
  const live = makeSeed({ id: "live" });
  assert.deepEqual(boardOrder([cancelled, live]).map((s) => s.id), ["live"]);
});
