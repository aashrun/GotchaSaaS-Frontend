# Neon read performance

Measured 14 October 2026 against the configured Neon database from the local API. Each row reports the median of three authenticated requests before and after. This is a small interactive benchmark, not a load test or latency guarantee. Temporary measurement sessions were removed; existing projects, passwords and credits were preserved.

| Read                 |  Before |  After | Improvement |
| -------------------- | ------: | -----: | ----------: |
| Account              |  524 ms | 237 ms |         55% |
| Project library      | 1038 ms | 505 ms |         51% |
| Full billing history | 1438 ms | 683 ms |         53% |
| Workspaces           |  953 ms | 478 ms |         50% |
| Project opening      | 2763 ms | 944 ms |         66% |

The sidebar now uses `/billing/summary`: median 484 ms, 230 response characters, compared with 18,757 for full billing. Project response size fell from 149,953 to 39,709 characters by excluding internal execution checkpoints and preview HTML at the database projection. These are JavaScript string lengths, not compressed network byte counts.

## Changes

- Session/user and project/membership authorization use joined reads. Transactional write authorization retains its original locking path. Sessions, suspensions and membership permissions are checked on every request.
- Project library pagination/counts are authorized in their queries; workspace listing joins memberships rather than making a separate lookup.
- Independent billing reads run concurrently. The sidebar fetches only current credit-account information.
- The pooled connection idle timeout is 60 seconds instead of 10 seconds, with TCP keepalive enabled. Pool limits stay bounded, min remains zero, and no artificial warm-up polling was added.
- Migration 011 adds tenant/history sort indexes for projects, messages, jobs, checkpoints, checks, deployments, credit ledger and usage. It has been applied to Neon and both fixture databases.
- Frontend matching concurrent GETs share a single in-flight request. Completed responses are not cached. Changes to authentication or mutations invalidate in-flight sharing; cancellable/custom-header requests remain independent.

## Verification and remaining latency

86 backend checks and 20 browser workflows passed; nine optional provider contracts remained skipped. Syntax, production build and formatting passed. The browser fixture API initially refused startup until migration 011 was applied to its isolated database; the subsequent complete suite passed.

A final direct database round trip measured 276 ms. The API currently runs on this laptop while the configured Neon endpoint is in US East (Ohio). Network travel remains a substantial latency floor; hosting the API/worker near that database is the next deployment improvement. This change does not migrate the database region or claim every query/workload is now optimized. Full source exports and large project histories still need bandwidth and pagination planning as data grows.
