# Research: Branding Updates, Health Checks, and Content Quality

**Feature**: 002-allow-updating-the  
**Date**: 2025-09-29  
**Input**: Technical context from plan.md and spec.md clarifications

## Research Findings

### Podcast Artwork Constraints and Propagation

**Decision**: Enforce Apple Podcasts constraints (square; 1400–3000 px; JPEG/PNG; RGB)
**Rationale**: Matches major platform requirements; reduces rejection risk
**Alternatives considered**: Allow other sizes/formats → increases failure risk

**Propagation SLO**: Within 24 hours to podcast apps
**Rationale**: Allows for app caching and CDN delays

### YouTube Propagation Scope

**Decision**: Per‑video only (future videos)
**Rationale**: Avoids channel‑level permissions, minimizes risk; meets need
**Alternatives**: Channel branding changes → higher complexity and permissions

### iOS Shortcut E2E Strategy

**Decision**: Dry‑run locally; publish server heartbeat
**Rationale**: Zero side‑effects; validates Shortcut wiring; server health visible
**Alternatives**: Test mode endpoint → higher complexity; production tag → risk of leakage

### Script Defaults

**Decision**: 12–20 minutes; tone “Energetic, conversational, and warm”
**Rationale**: Target commute‑friendly episodes; engaging style
**Alternatives**: Shorter or longer ranges; different tones

### Branding Conflict Policy

**Decision**: Last‑write‑wins
**Rationale**: Simple, predictable; audit trail covers accountability
**Alternatives**: Versioning → more complexity for limited value now

### Health Checks

**Decision**: Two explicit checks
- YouTube processing: status, message, last_success_at
- Document ingestion: status, message, last_success_at
**Rationale**: Clear visibility and troubleshooting signals

---

## Open Questions
None (resolved during clarification loop).
