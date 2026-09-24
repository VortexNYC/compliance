# Vortex Compliance Posture

**We're not certified — we're doing the work in public.**

This repository is our living proof. Each Vortex product runs a continuous
self-assessment against the compliance frameworks it's targeting — SOC 2,
PCI DSS, ISO 27001 and others depending on what the product handles. These
pages are generated automatically from our internal compliance platform and
update daily. They show real state, including the gaps.

If a number looks bad, that's the point: we'd rather show you honest
progress than a badge we haven't earned.

## Products

| Product | Status page | Frameworks tracked |
|---------|-------------|--------------------|
| vortex | [products/vortex.md](products/vortex.md) | SOC 2, PCI DSS |
| veil | [products/veil.md](products/veil.md) | SOC 2, ISO 27001 |
| seal | [products/seal.md](products/seal.md) | SOC 2 |
| pile | [products/pile.md](products/pile.md) | SOC 2 |

## How this works

- Compliance state lives in our self-hosted CompAI instance (controls,
  policies, tasks, evidence, findings).
- A scheduled workflow reads each product's compliance summary through the
  API and regenerates the markdown pages in `products/`.
- No raw findings or evidence content are published — counts and framework
  progress only. The details stay private; the trajectory stays public.

_Last export: 2026-09-24 17:02 UTC_
