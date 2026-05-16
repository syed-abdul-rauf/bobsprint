# BobSprint — Benchmark

> Generated: 2026-05-15 23:10 UTC
> Mode: **BOB_MOCK=1** (bridge mock responses, 1510ms avg per call)
> Pipeline model: 3 safe-win items, 12 total Bob calls

## Pipeline timing (mock mode)

| Fixture | Recon | Fan-out+Code | Safety gate | Apply+PR | **Total** |
|---------|-------|-------------|-------------|----------|-----------|
| northpeak-demo (fixture) | 0.1s | 6.0s | 4.5s | 6.0s | **16.7s** |
| minimalist-js-lib (mock) | 0.5s | 6.0s | 4.5s | 6.0s | **17.1s** |
| small-python-cli (mock) | 0.5s | 6.0s | 4.5s | 6.0s | **17.1s** |

## Notes

- **Mock mode** replaces real Bob Shell with canned responses (1.5s delay per call).
- Real Bob Shell timings will be longer (network + model inference); claim 1 target is
  **under 300 seconds** for a full rescue including real Bob responses and GitHub writes.
- Average mock call latency: **1510ms** — budget for real Bob: ~10–30s/call.
- Estimated real-mode pipeline time (optimistic): **197–377s**.

## Stage breakdown

| Stage | What happens | Bob calls |
|-------|-------------|-----------|
| 1 Recon | GitHub tree fetch + snapshot | 0 |
| 2 Fan-out | Plan (parallel Ask), Code×3 | 5 |
| 3 Safety gate | Ask×3 per pending win | 3 |
| 4 Apply | CommitMsg Ask×3 + PR body Ask×1 + GitHub writes | 4 |
| 5 Done | Metrics computed, redirect | 0 |

## Claim 1 status

Mock pipeline completes in **17.0s** on average.
Real Bob mode target: under 300s (5 min). Run claim 1 verification with real Bob Shell
to confirm. Mock timing cannot validate this claim.
