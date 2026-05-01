---
uri: klappy://canon/articles/hero-metrics-and-storytelling
title: "Hero Metrics and Storytelling — Why These Four, What They Tell, How They Age"
audience: project
exposure: working
voice: instructional
stability: working
tags: ["appbuilder", "snapshot", "track-a", "metrics", "storytelling", "rationale", "telemetry", "vodka-architecture"]
epoch: E0008
date: 2026-05-01
derives_from: "src/snapshot.ts METRICS (parity row P2.8), klappy://canon/articles/snapshot-operations (P2.15), klappy://canon/governance/telemetry-governance"
governs: "the rationale layer for the four METRICS in src/snapshot.ts: why these four (and not five or three), what each one tells the project, how each ages, and the failure modes the snapshot mechanism is designed to prevent"
companion_to: "klappy://canon/articles/snapshot-operations, src/snapshot.ts"
status: working
---

# Hero Metrics and Storytelling — Why These Four, What They Tell, How They Age

> The snapshot mechanism stores four weekly aggregates: total builds,
> successful builds, failure-mode distribution, and APK bytes
> delivered. Each of the four answers a different stakeholder
> question — "are people using this?", "does it work?", "when it
> doesn't, why?", "is it useful enough to keep building?" — and each
> ages on a different timescale. This article is the why-these-four
> argument; `src/snapshot.ts` is the what; `snapshot-operations.md`
> is the how.

## Summary — The four metrics, in one sentence each

1. **`total_builds_weekly`** — *How much is appbuilder-mcp being used?*
   Counts all `job_terminal` events per week. The traffic floor.

2. **`successful_builds_weekly`** — *How often does it work?*
   Counts `job_terminal` with `failure_mode = success`. The success
   numerator. Pair with #1 to compute the success rate.

3. **`failure_mode_distribution_weekly`** — *When it fails, why?*
   Groups `job_terminal` by `failure_mode`. One row per
   `(week, failure_mode)` pair. The diagnostics map.

4. **`apk_bytes_weekly`** — *Is the work valuable?*
   Sums `bytes_out` across successful `job_terminal` events. The
   lifetime hero stat. Bytes shipped to scripture-app builders means
   real APKs in real hands.

The four are deliberately small and deliberately separate. Combining
them at write-time (e.g. storing only "success rate" as a derived
ratio) would lose information — you couldn't reconstruct success
rate's denominator if you wanted to ask "was this week slow because
of fewer attempts or more failures?" The composability of "raw
counts you can divide later" is the design.

---

## §1 — Why exactly four?

The parity spec asked for "at least four metrics covering build
count, success rate, failure-mode distribution, lifetime cumulative."
Four maps onto four. Adding a fifth metric for "cache hit rate" was
considered (cf. ptxprint-mcp's `cache_hits_weekly` /
`cache_misses_weekly` split) and deferred for two reasons:

1. **The cache contract is invisible from the user's perspective.**
   A successful build is a successful build whether it took 5 minutes
   or 5 milliseconds. The cache lives at the infrastructure layer;
   exposing it to the metric layer would invert the abstraction.

2. **The cache rate is computable from `submit_build` request
   telemetry**, not `job_terminal`. Adding it to the snapshot would
   broaden the SQL surface beyond `WHERE blob1 = 'job_terminal'`,
   which currently anchors all four metrics to the same predicate.
   The architectural simplicity of "four queries against the same
   slice" is worth preserving.

If a future row demonstrates that cache observability matters at the
weekly-archive timescale, append a fifth metric. The runner is
fully table-driven over `METRICS`; the addition is a few lines, not
a refactor.

---

## §2 — Stories the metrics tell

### 2.1 The traffic story (`total_builds_weekly`)

Stakeholder question: *Is anyone using this?*

The answer is "yes / no / how many." Numbers above zero are the
floor of project relevance — if no one is submitting jobs, the rest
of the metrics don't matter.

Aging: weekly granularity is right. Daily would be noisy (a
non-business-day run-rate of zero is normal); monthly would obscure
the week-over-week growth signal that early-stage projects most need.

Look-back horizon: 12 weeks (one quarter) is enough to see whether
adoption is growing or declining. Beyond 12 weeks, the
quarter-over-quarter comparison is the next-order question, and
that's a chart-on-archive task, not a metric on its own.

### 2.2 The reliability story (`successful_builds_weekly`)

Stakeholder question: *When people use it, does it work?*

Pair with #2.1 to compute success rate as
`successful_builds_weekly / total_builds_weekly`. The two are stored
separately because you also want to ask the dual question: was this
week's drop in success rate caused by *fewer successes* or *more
failures*? With just a stored ratio, you can't tell.

Aging: weekly granularity again. A single bad day's cluster of
failures can dominate a daily ratio; weekly smooths to the steady-
state signal. If a single week's success rate drops below 80%, that
is the alert threshold worth investigating.

Composes with: §2.3 (failure-mode distribution) tells you *which*
failures spiked.

### 2.3 The diagnostics story (`failure_mode_distribution_weekly`)

Stakeholder question: *When it fails, why?*

The shape: one row per `(week_start, failure_mode)`. Empty
`failure_mode` is filtered out at write-time; the four canonical
modes (`success`, `soft`, `hard`, `timeout`, `cancelled`) are the
expected values. The `success` row in this metric duplicates
`successful_builds_weekly` — that's intentional. Reading this metric
in isolation gives a complete weekly picture without joining.

This metric ages differently from the others — failure-mode names
themselves can change. If `container/main.py:classify_failure()`
gets a new `manifest_merge` mode in a future container release, that
shows up as a new `failure_mode` value starting that week. Older
weeks don't retroactively gain the new value; the archive truthfully
reflects the classifier's state at the time of writing.

This is fine, and explicit: the metric is a **time-stamped
classifier output**, not an absolute count of objective phenomena.
A consumer reading 6 months back must read it through that lens.

### 2.4 The value story (`apk_bytes_weekly`)

Stakeholder question: *Is the project producing real value?*

`bytes_out` per successful `job_terminal` is the APK byte count
uploaded to R2. Summed weekly, it's the byte-volume of scripture
APKs the project produced. Cumulative across the archive plus the
current week, it's the lifetime number.

This is the **hero stat** — the single number that, told to a
non-technical stakeholder, conveys "this thing exists and people use
it." Pages typeset was the equivalent for ptxprint-mcp's PDFs; APK
bytes is the SAB analogue.

Why bytes and not "build count"? Because build count is dominated by
small smoke-test builds (the developer running the same test 50
times). Bytes capture an APK's actual scale — a Bible APK is
typically 30-100 MB, a single-book test build is 5-10 MB. Bytes
weight production-shaped builds higher than test-shaped builds, and
that's the right weighting for "how much of the world is this
serving?"

Aging: cumulative across all archived weeks, plus current week from
raw AE — see `getLifetimeHeroStat()` in `src/snapshot.ts`.
Subjectively, the number only goes up. Practically, it can decrease
if an old archived week's data is regenerated under a different
classifier (rare; would only happen if `bytes_out` measurement
itself changed). Treat any monotonic-decrease event as a bug.

---

## §3 — How the metrics age

| Metric | Steady-state aging | Storage cost (per week) | Read pattern |
|---|---|---|---|
| `total_builds_weekly` | One number per week | ~100 B JSONL | Time-series |
| `successful_builds_weekly` | One number per week | ~100 B JSONL | Time-series |
| `failure_mode_distribution_weekly` | One row per `(week, failure_mode)` — typically 4–5 rows | ~500 B JSONL | Per-week breakdown |
| `apk_bytes_weekly` | One number per week | ~120 B JSONL | Cumulative + current-week composite |

After 5 years (260 weeks), the entire archive is well under 1 MB
total across all four metrics. R2 storage cost is negligible. The
aging cost is operator attention to interpretation, not bytes.

The 90-day Analytics Engine retention window is the constraint that
forces archival. Without the snapshot mechanism, anything older than
90 days is gone. With it, the project can answer "what was the
reliability trend during the 2027-Q3 image rollover?" three years
later.

---

## §4 — Failure modes the snapshot mechanism prevents

1. **Silent retention loss.** AE rows quietly age out at 90 days. A
   project that doesn't snapshot loses the ability to talk about
   anything older than three months. The snapshot mechanism keeps
   the lifetime archive even as the live tail rotates.

2. **Numerator-denominator divorce.** Storing only derived ratios
   (success rate, failure rate) means you can't reconstruct the
   underlying counts. The four-metric design stores the components
   separately so any ratio is a future divide.

3. **Classifier drift hiding history.** When `classify_failure()`
   adds or renames a failure mode, the archive's prior weeks reflect
   the classifier as it was — not as it is. Reading the archive with
   the current classifier in mind without thinking about this is a
   way to draw wrong conclusions; explicitness here is the
   protection.

4. **Storytelling without a hero.** The four metrics are designed so
   the project always has *one* number to say to a stakeholder. APK
   bytes is the default; if the project's mission shifts (e.g. to
   number of unique apps published), the hero metric shifts too, and
   that's a `METRICS` table edit.

---

## §5 — When to add a fifth metric

The runner is table-driven; adding a metric is mechanically cheap.
The judgment call is *whether the metric tells a story none of the
existing four tell.* A new metric should:

- Answer a stakeholder question that the existing four cannot
  reconstruct via division or filter.
- Have a stable definition — one that won't need to change every
  release. Position-is-forever applies to schemas, but it also
  applies to metric definitions: a renamed metric is a new metric,
  not a relabel.
- Survive the "would I tell this number to a stakeholder?" test. A
  metric only the operator reads is a debug log, not a metric.

Examples of metrics that **passed** the test (in the spec's list):
build count, success rate, failure-mode distribution, lifetime
cumulative. Examples that **failed** for now:

- *Cache hit rate.* Useful for operations, invisible to users. The
  operator path through `wrangler tail` covers it.
- *Per-consumer build count.* Privacy-floor incompatible.
  `consumer_label` is a self-declared field; aggregating builds per
  consumer and archiving long-term would create a per-consumer
  history the privacy floor doesn't sanction.
- *Build duration percentiles.* Worth tracking, but the right tool
  is AE's live percentile query, not a weekly snapshot — duration
  distributions don't archive cleanly.

---

## Cross-references

- `src/snapshot.ts` — the `METRICS` table this article justifies.
- `klappy://canon/articles/snapshot-operations` — the operator
  recipes for running snapshots and reading the hero stat.
- `klappy://canon/governance/telemetry-governance` — the privacy
  floor the metrics respect.
- `klappy://canon/articles/failure-mode-taxonomy` — the canonical
  set of `failure_mode` values §2.3 references.
- `src/telemetry-schema.ts` — the BLOB / DOUBLE schema the metrics
  query against. `apk_bytes_weekly` reads `double4 = bytes_out`;
  any change to that position would require a `METRICS` SQL update.
