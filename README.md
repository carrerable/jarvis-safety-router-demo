# JARVIS — code-enforced safety router

> Public mini-demo with fictional data. The full product is private; access on request: carrerabernal@gmail.com

## Live demo

https://carrerable.github.io/jarvis-safety-router-demo/

## What it demonstrates

- A router with a fixed order: confirmation, shortcut, catalog, fast route (regex in Spanish and English), then a simulated LLM.
- Tools split in three sets, enforced in code: safe (run), dangerous (wait for "confirm" or "confirmo"), prohibited (never run: `delete_file`, `run_shell`, `send_message`).
- Veto words (`borra`, `elimina`, `delete`, `remove`, `no`) always send the request to the LLM path.
- Trace chips on every answer. The latencies (2.7 s fast path, 8.6 s LLM path) are measured on the real system and shown as fixed values.

## What is fictional and what is real

There is no real model, no real tool and no network: the "LLM" is a stub and every tool output is fictional. The safety design and the two latencies come from the real, private project. The code is written from scratch.

## Run locally

```bash
npm ci && npm run dev
```

Add `?lang=es` for Spanish.

## Tests

```bash
npm test
```

## How it was built

Code written with Claude Code under my specs and code review; I designed the behavior, wrote the acceptance tests and verified the result.

## Case study

https://carrerable.github.io/en/projects/jarvis/

## License

MIT
