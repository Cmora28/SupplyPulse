# Daily supplier alerts

Public news is collected once per supplier per day and shared across customers. The weekly report pipeline is unchanged. Severe items can also send an interim email on Plus and above.

## What runs

The Railway worker (`src/worker.ts`) keeps the existing 15-minute weekly scheduler and adds a daily job at **06:00 UTC** (`daily-supplier-news`).

For each distinct supplier (normalized name + country, for example `maersk|DK`):

1. Fetch Google News RSS and GDELT for the last two days. No LLM.
2. Keep items whose title or snippet matches the disruption keyword list.
3. Insert new rows with `createMany({ skipDuplicates: true })` on `(supplierKey, urlHash)`. `urlHash` is the SHA-256 of the normalized URL. Republished headlines with a different URL are dropped in the same step.
4. Score each new row with JEV (`POST https://api.typesafe.ai/v1/systemone`, model `jev-latest`, question type `noul`, prompt version `v1`). The probability is `answers.p.noul`.
5. Apply the fixed bands:
   - below 0.20: `ignored`
   - 0.20 up to 0.60: `watch` (included in the next weekly report)
   - 0.60 and above: `escalate` (weekly report, and an interim alert when the plan allows it)

If `JEV_API_KEY` is missing or JEV returns 401/403, collection still runs. Those rows stay `unclassified` and no alert is sent. The next daily run retries them. A Perplexity failure on escalation still sends the alert, using the headline, score, and source URL. The alert row records whether the summary came from Perplexity, a fallback, or a reused summary, and whether the email was sent or failed.

## Audit trail

Each daily job writes a `NewsRun` (counts, status, and an `errors` JSON array). Inserted `NewsItem` rows point at that run. Items that were fetched but not inserted are stored as `NewsCandidate` with `skipReason` of `no_keyword`, `cap`, `bad_url`, `dup_hash`, or `dup_title`. Each JEV attempt is a `JevCall`: HTTP status, latency, band, and the request and response JSON. The request body is the classifier payload only. The API key stays in the `Authorization` header and is never written. Response bodies are capped at about 8 KB.

Audit writes are caught and logged. A database error on the audit tables does not stop collection, classification, or email.

`JevCall.newsItemId` uses `ON DELETE SET NULL`, so the 90-day `NewsItem` purge does not fail on that foreign key. `NewsRun`, `JevCall`, and `NewsCandidate` are not part of the news-item purge. The same 90-day cutoff deletes old runs; calls and skipped candidates cascade with the run, and `NewsItem.runId` is set to null. Sent `SupplierAlert` rows are still kept.

Admins open **News audit** at `/dashboard/admin/news` (linked from the admin panel and the sidebar). The page lists runs, inserted items (with JEV status, score, band, latency, alert, and email), and a Skipped tab. A row opens the raw feed, every JEV call, and the alert email outcome. CSV export uses the same filters. The API is `GET /api/admin/news` and `GET /api/admin/news/items/[id]`, with the same admin email check and rate limit as the audit log.

## Who gets an email

| Plan | Interim alert |
| --- | --- |
| Free, Standard | None. Watch and escalate items are still passed into the weekly report. |
| Plus | Once mid-week: three days after the user's weekly report weekday (UTC). A Monday report sends on Thursday. |
| Premium, Enterprise | Every day a new severe item is waiting. |

Alerts respect `emailNotifications`. One email lists every severe item for that user. `SupplierAlert` rows are kept. The daily job deletes `NewsItem` rows older than 90 days when `jevP` is null or below 0.6 and no alert points at them. Scores of 0.6 and above stay.

## Migration

Production already has the Prisma tables from `db push`. Apply only the new tables:

```bash
npx prisma db execute \
  --file prisma/sql/20261031_news_items_supplier_alerts.sql \
  --schema prisma/schema.prisma
```

The script creates `NewsItem` and `SupplierAlert` if they are missing, plus indexes and foreign keys. It does not rewrite existing tables. Do not run `prisma migrate reset` or `prisma db push --force-reset`.

The audit tables are a second script:

```bash
npx prisma db execute \
  --file prisma/sql/20261031_news_pipeline_audit.sql \
  --schema prisma/schema.prisma
```

That adds `NewsRun`, `JevCall`, and `NewsCandidate`, a nullable `NewsItem.runId`, and summary/email columns on `SupplierAlert`. It is safe to re-run. The worker applies both scripts at startup and again at the start of the daily job, so a new deploy creates the tables before it scores news. If `DATABASE_URL` is missing or a script fails, the error is logged and the weekly scheduler still starts.

Local development can use the same commands, or `npx prisma db push` against a dev database.

## Railway deploy

1. Apply the SQL above to the Railway Postgres **before** relying on the new job.
2. On the **worker** service, set `JEV_API_KEY` (TypeSafe). Do not commit the key. The Next.js app on Vercel does not need it.
3. Redeploy the worker so it registers the 06:00 UTC cron. Logs should include `Daily supplier news cron set: 06:00 UTC`.
4. Keep `PERPLEXITY_API_KEY` and `RESEND_API_KEY` on the worker. Escalation summaries use `sonar-deep-research`. If Perplexity is down, the email still goes out with the source link.

The weekly scheduler, report worker, and finalizer are the same processes. A missing news table does not stop a weekly report: signal lookup is skipped and the report is generated as before.

## Cost notes (31 Oct 2026 design)

Assumptions: about 20 public items per supplier per day, about 10% pass the keyword filter (2 JEV calls), about 2% of those calls escalate to the large model. Cache is per supplier, not per customer. JEV measured at about 435 input tokens, 20 output tokens, and about 0.35s per call. TypeSafe has not published a price; budget from the token volume below.

| Unique suppliers | JEV calls / month | Input / output tokens | Escalations / month |
| --- | --- | --- | --- |
| 50 | 3,000 | 1.3M / 60k | 60 |
| 500 | 30,000 | 13M / 0.6M | 600 |
| 5,000 | 300,000 | 130M / 6M | 6,000 |

Only keyword hits are stored (about 1.5 KB per row including the RSS JSON). At 2 hits/day and a 90-day TTL on scores below 0.6:

| Unique suppliers | Steady news rows | Disk (about 1.5 KB) | Railway disk at $0.15/GB-month |
| --- | --- | --- | --- |
| 50 | 9,000 | ~14 MB | under $0.01 |
| 500 | 90,000 | ~135 MB | about $0.02 |
| 5,000 | 900,000 | ~1.4 GB | about $0.20 |

Storing every collected item instead of keyword hits is roughly 10× larger (about 13.5 GB and $2/month at 5,000 suppliers). Full article text is not stored.

Escalation calls the existing Plus model (`sonar-deep-research`) once per severe item, then reuse the summary. The design's stand-in price for a smaller large model (gpt-5-mini) was about $0.14 / $1.44 / $14.40 per month at 50 / 500 / 5,000 suppliers. Confirm the Perplexity unit cost on the current invoice and multiply by the escalation counts above. Fetch CPU is well under a dollar at 500 suppliers.

Railway Hobby's 5 GB volume is enough for metadata at these sizes. Move to Pro before storing full article text or dropping the TTL.

Thresholds are provisional: the 31 Oct 2026 sample (routine Foxconn, Maersk, and Bosch headlines) scored 0.01–0.07 and did not include a confirmed severe disruption.
