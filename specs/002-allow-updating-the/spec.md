# Feature Specification: Branding Updates, Health Checks, and Content Quality Improvements

**Feature Branch**: `002-allow-updating-the`  
**Created**: 2025-09-29  
**Status**: Draft  
**Input**: User description: "Allow updating the podcast image and title (with proper propagation to feeds). Add a health check to confirm YouTube ingestion is functional (YouTube is a content source, not a publishing target). Add a health check to confirm document ingestion is functional. Add an end-to-end check that the iOS Shortcut is working correctly. Improve the quality of script generation (structure, tone, length). Improve the handling of voice selection (voice styles, fallback, previews)."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a podcast creator using Podcast Generator, I want to update my show’s title and image and trust that these changes propagate to all podcast distribution channels, and I want clear health checks for YouTube ingestion (as a content source), document ingestion, and my iOS Shortcut, so that my feed remains accurate and reliable. I also want better episode scripts and voice selection so the episodes sound more polished and consistent.

### Acceptance Scenarios
1. Branding update — title
   - **Given** a creator has an existing podcast feed, **When** they change the podcast title, **Then** the new title appears in their podcast feed and downstream podcast apps upon the next refresh, and all newly generated episodes reflect the new title.
2. Branding update — image
   - **Given** a creator uploads a new podcast image that meets Apple Podcasts constraints (square; 1400x1400 to 3000x3000 px; JPEG or PNG; RGB), **When** the change is saved, **Then** the new image is published to the feed and becomes visible in podcast apps within 24 hours.
3. Health check — YouTube ingestion
   - **Given** the system is operating normally, **When** a health check is performed, **Then** the YouTube ingestion status reports OK and includes a recent successful ingestion timestamp.
4. Health check — document ingestion
   - **Given** the ingestion pipeline is available, **When** a health check is performed, **Then** the document ingestion status reports OK and includes a recent successful ingestion timestamp.
5. End-to-end check — iOS Shortcut
   - **Given** a valid iOS Shortcut configuration, **When** the end-to-end check runs in dry‑run mode, **Then** the Shortcut locally validates the workflow without sending content to the server or creating public artifacts, and the system’s published server heartbeat shows OK with a recent timestamp.
6. Script quality
   - **Given** a typical article or video, **When** a script is generated, **Then** it follows a clear structure (hook/intro, key points, transitions, recap, outro), uses a consistent conversational tone, and targets 12–20 minutes in duration.
7. Voice selection
   - **Given** voice styles are available, **When** a user selects a preferred style, **Then** they can preview it before use, and if that style is unavailable at generation time, a deterministic fallback is applied and communicated to the user.

### Edge Cases
- Branding changes during active processing jobs (race conditions / partial updates)
- Image not meeting constraints (non-square, too large, unsupported format)
- YouTube API outage or rate limiting during ingestion; health check should degrade gracefully
- Document ingestion source inaccessible or invalid; health should reflect cause
- iOS Shortcut device offline or missing permissions
- Multiple rapid branding updates; last write wins vs. versioning [NEEDS CLARIFICATION]
 - Multiple rapid branding updates — last‑write‑wins applies; the most recent saved change becomes canonical
- Cached feeds or CDNs delaying display in podcast apps

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001 (Branding: Title)**: System MUST allow creators to update the podcast title and persist it as the canonical show title.
- **FR-002 (Branding: Image)**: System MUST allow creators to upload and set a podcast image that meets Apple Podcasts constraints: square aspect; dimensions between 1400x1400 and 3000x3000 pixels; JPEG or PNG format; RGB color space.
- **FR-003 (Propagation: Feeds)**: System MUST propagate updated title and image to the creator’s podcast feed and make them observable in podcast apps within 24 hours.
- **FR-004 (YouTube Ingestion: Source)**: System MUST support ingesting YouTube links as a content source for podcast generation. The system MUST NOT attempt to publish or update content on YouTube as a distribution channel.
- **FR-005 (Health: YouTube Ingestion)**: System MUST expose a health check indicating whether YouTube ingestion is functional, including current status, a human-readable message, and the timestamp of the last successful ingestion.
- **FR-006 (Health: Document Ingestion)**: System MUST expose a health check indicating whether document ingestion is functional, including current status, a human-readable message, and the timestamp of the last successful ingestion.
- **FR-007 (E2E Check: iOS Shortcut)**: System MUST provide an end‑to‑end check via the iOS Shortcut in dry‑run mode that validates the Shortcut workflow locally without creating or submitting content, and MUST publish a server heartbeat status with an overall state and recent timestamp so the Shortcut can display backend health.
- **FR-016 (Server Heartbeat)**: System MUST publish a heartbeat status indicating overall health (OK/DEGRADED/FAILED) and a recent timestamp, accessible for user visibility and Shortcut verification.
- **FR-008 (Script Quality: Structure)**: System MUST produce scripts that follow a defined structure: intro/hook, 3–7 key points with transitions, recap, and outro.
- **FR-009 (Script Quality: Tone)**: System MUST produce scripts in a consistent, user-appropriate tone configurable per show, with the default tone set to “Energetic, conversational, and warm.”
- **FR-010 (Script Quality: Length)**: System MUST target a consistent episode length range of 12–20 minutes.
- **FR-011 (Voice Selection: Catalog)**: System MUST present a catalog of voice styles with descriptive labels and language/locale metadata.
- **FR-012 (Voice Selection: Previews)**: System MUST allow users to preview a selected voice style before use.
- **FR-013 (Voice Selection: Fallbacks)**: System MUST define a deterministic fallback policy if the preferred voice is unavailable, and inform the user of the applied fallback.
- **FR-014 (Visibility: Status)**: System MUST surface status and timestamps for health checks and e2e checks to authorized users.
- **FR-015 (Auditability)**: System MUST record when branding changes occur (who/when/what changed) for accountability.
- **FR-017 (Branding Conflicts: LWW)**: For concurrent or rapid branding updates, the system MUST apply a last‑write‑wins policy: the change with the latest persisted timestamp becomes the canonical title/image for propagation and publication. In‑flight processing MUST reference the latest branding available at time of feed update/publication.

### Key Entities *(include if feature involves data)*
- **Podcast Branding**: Represents the show’s canonical branding, including title, image reference, last updated timestamp, and version/revision information.
- **Distribution Surface**: Represents a destination where the show appears (e.g., RSS feed). Attributes include name, status, last sync, and notes about propagation. YouTube is not a distribution surface; it is a content source for ingestion.
- **Health Check**: Represents a named check (YouTube processing, document ingestion) with fields: status (OK/DEGRADED/FAILED), message, last_success_at, last_checked_at.
- **E2E Check**: Represents an end-to-end Shortcut verification, including status, timestamp, and summary of the verification steps.
- **Voice Profile**: Represents a voice style with id, display name, language/locale, style tags, availability, and preview sample reference.
- **Script Policy**: Represents guidance for structure, tone, and length targets that scripts should adhere to.

---

## Clarifications
*Decisions captured during specification review*

### Session 2025-09-29
- Propagation to podcast apps: within 24 hours.
- Image constraints (Apple Podcasts): square; 1400x1400 to 3000x3000 px; JPEG or PNG; RGB.
- YouTube ingestion: system supports ingesting YouTube links as a content source only; no publishing or branding changes on YouTube.
- iOS Shortcut E2E: dry–run locally with no server submission; server provides a public heartbeat (OK/DEGRADED/FAILED + timestamp) for backend status.
 - Script defaults: 12–20 minutes; tone = “Energetic, conversational, and warm.”
 - Conflict policy: Last–write–wins for branding changes.

<!-- No pending clarifications at this time. -->

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---
