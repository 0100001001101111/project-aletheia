# Project Aletheia

We don't chase ghosts. We find patterns.

Open-source infrastructure for anomaly research. 25 autonomous AI agents running on a Raspberry Pi analyze scientific data across domains that mainstream academia won't touch: near-death experiences, remote viewing, crisis apparitions, UFO/UAP sightings, and geophysical anomalies.

## How It Works

Each agent has a specific role. Discovery hunts for papers. Deep-miner crunches statistics. Skeptic tries to poke holes in everything the others find. They run on scheduled cycles, post findings to a database, and a human reviews every result.

When an agent's finding gets rejected, the rejection feedback gets injected into its next run so it learns from mistakes. The system is self-correcting: agents catch each other's errors without human intervention.

## What Makes This Different

- Rigorous methodology applied to fringe topics that typically suffer from poor research standards

- Built-in bias detection (Themis agent monitors five quantitative metrics across the swarm)

- Quality scoring that rejects weak data — null results are documented, not buried

- Cross-domain pattern matching across unrelated research fields

## Tech Stack

- Agents: OpenClaw framework on Raspberry Pi 5, running through REI proxy

- Frontend: Next.js 14, React, Tailwind, TypeScript

- Database: Supabase (PostgreSQL + Auth + RLS)

- Search: Brave Search API + LanceDB vector memory

- Hosting: Vercel

## Live

[projectaletheia.org](https://projectaletheia.org)
