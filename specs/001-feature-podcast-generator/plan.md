# Implementation Plan: Podcast Generator

**Branch**: `001-feature-podcast-generator` | **Date**: 2024-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-feature-podcast-generator/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, or `QWEN.md` for Qwen Code).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
**Primary Requirement**: Convert web content (URLs, YouTube videos, documents) into podcast episodes via iOS Share Sheet, with 15-minute processing time and RSS feed distribution.

**Technical Approach**: Azure Functions + n8n workflows + ElevenLabs TTS + Azure OpenAI + Firecrawl + Azure Blob Storage + Azure CDN + PostgreSQL database, designed for 1-3 users with anonymous access and 90-day retention.

## Technical Context
**Language/Version**: Node.js 18+, TypeScript 5.0+  
**Primary Dependencies**: Azure Functions, n8n, ElevenLabs API, Azure OpenAI, Firecrawl API, Azure SDK, Express.js  
**Storage**: PostgreSQL database (Azure Database for PostgreSQL), Azure Blob Storage for audio files  
**Testing**: Jest, Supertest, Azure Functions testing framework  
**Target Platform**: Azure Cloud, iOS 15+ (Share Sheet), RSS-compliant podcast players  
**Project Type**: web (API + mobile integration)  
**Performance Goals**: 15-minute processing time, 10 concurrent jobs, 99.9% uptime  
**Constraints**: 1-3 users, 90-day retention, anonymous access, RSS compliance, 15-minute episode duration  
**Scale/Scope**: 1-3 users, 10 concurrent processing jobs, 90-day episode retention

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principles
- [x] **Single Responsibility**: Each component has one clear purpose
- [x] **Minimal Dependencies**: Using established Azure services and n8n
- [x] **Clear Interfaces**: RESTful APIs and standard RSS feeds
- [x] **Testable Design**: Contract tests and integration tests planned

### Complexity Gates
- [x] **No more than 4 external services**: Azure, n8n, ElevenLabs, Firecrawl
- [x] **No more than 2 databases**: PostgreSQL (primary), Azure Blob (storage)
- [x] **No more than 3 API endpoints**: Submit content, check status, RSS feed
- [x] **No more than 2 user interfaces**: iOS Share Sheet, RSS feed

### Justification for Architecture
- **Azure Functions**: Serverless compute for scalable content processing
- **n8n**: Workflow orchestration for complex content processing pipeline
- **ElevenLabs**: High-quality TTS with Azure TTS fallback
- **Azure OpenAI**: AI content processing and dialogue generation
- **Firecrawl**: Robust web content extraction and scraping
- **PostgreSQL**: Relational data for episodes, feeds, and processing status
- **Azure Blob**: Object storage for audio files with CDN distribution

## Project Structure

### Documentation (this feature)
```
specs/001-feature-podcast-generator/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Web application (API + mobile integration)
api/
├── src/
│   ├── functions/
│   │   ├── content-submission/
│   │   ├── status-check/
│   │   └── rss-feed/
│   ├── models/
│   │   ├── episode.ts
│   │   ├── feed.ts
│   │   └── submission.ts
│   ├── services/
│   │   ├── content-extractor.ts
│   │   ├── tts-service.ts
│   │   └── rss-generator.ts
│   └── utils/
│       ├── validation.ts
│       └── storage.ts
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

n8n-workflows/
├── content-processing.json
├── youtube-extraction.json
└── document-processing.json

ios/
├── ShareExtension/
│   ├── ShareViewController.swift
│   └── Info.plist
└── Shortcuts/
    └── SendToPodcast.shortcut
```

**Structure Decision**: Web application (API + mobile integration) - Azure Functions backend with iOS Share Sheet frontend

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Azure Functions best practices for content processing
   - n8n workflow patterns for content extraction
   - ElevenLabs API integration and fallback strategies
   - Azure Blob Storage with CDN for audio distribution
   - PostgreSQL schema design for podcast metadata
   - iOS Share Sheet extension development
   - RSS feed generation and validation

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research Azure Functions for content processing workflows"
     Task: "Research n8n workflow patterns for content extraction"
     Task: "Research ElevenLabs API integration and error handling"
     Task: "Research Azure OpenAI for content processing and dialogue generation"
     Task: "Research Firecrawl API for web content extraction"
     Task: "Research Azure Blob Storage with CDN for audio distribution"
     Task: "Research PostgreSQL schema design for podcast metadata"
     Task: "Research iOS Share Sheet extension development"
     Task: "Research RSS feed generation and iTunes compliance"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical decisions resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - ContentSubmission: url, type, status, metadata
   - PodcastEpisode: title, description, audio_url, duration, pub_date
   - UserFeed: slug, title, description, episodes
   - ProcessingJob: status, progress, error_message, timestamps

2. **Generate API contracts** from functional requirements:
   - POST /api/content - Submit content for processing
   - GET /api/content/{id}/status - Check processing status
   - GET /api/feeds/{slug}/rss.xml - RSS feed endpoint
   - Output OpenAPI schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh cursor` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 4 external services | Azure (infrastructure), n8n (workflows), ElevenLabs (TTS), Firecrawl (scraping) | Each serves distinct purpose, no single service covers all needs |
| 2 databases | PostgreSQL (metadata), Azure Blob (files) | Relational data vs object storage have different access patterns |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*