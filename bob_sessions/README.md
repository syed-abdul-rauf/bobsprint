# bob_sessions/

This directory contains Bob Bridge invocation logs and exported session artifacts.

## Files

| File | Description |
|------|-------------|
| `bridge.log` | JSONL log of every Bob Shell spawn — command, args, mode, duration, exit code. Prompt and response bodies are never stored here. |

## bridge.log format

One JSON object per line:

```json
{"ts":"2026-05-16T12:34:56.789Z","command":"bob","args":[],"mode":"Plan","durationMs":1512,"exitCode":0,"ok":true}
```

Fields: `ts`, `command`, `args`, `mode` (Plan/Ask/Code/null), `durationMs`, `exitCode`, `ok`, `streaming?`, `spawnError?`

## Gitignore note

`*.local.*` files in this directory are excluded from git (private exports).
The log file itself (`bridge.log`) is committed so judges can see evidence of Bob invocations.
