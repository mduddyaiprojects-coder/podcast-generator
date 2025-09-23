# Tasks: Podcast Generator
 

**Input**: Design documents from `/specs/001-feature-podcast-generator/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app**: `api/src/`, `n8n-workflows/`
- Paths shown below assume web application structure

## Phase 3.1: Setup
- [x] T001 Create project structure per implementation plan
- [x] T002 Initialize Node.js project with Azure Functions dependencies
- [x] T002-FIX Fix Jest configuration - correct moduleNameMapping property name
- [x] T003 [P] Configure TypeScript and ESLint for Azure Functions
- [x] T004 [P] Set up Azure Functions local development environment
- [x] T005 [P] Configure n8n workflow environment and credentials
- [x] T006 [P] Set up PostgreSQL database schema and migrations
- [x] T007 [P] Configure Azure Blob Storage and CDN
- [x] T008 [P] Set up iOS Share Sheet extension project structure

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T009 [P] Contract test POST /api/content in tests/contract/test_content_submission.py
- [x] T010 [P] Contract test GET /api/content/{id}/status in tests/contract/test_status_check.py
- [x] T011 [P] Contract test GET /api/feeds/{slug}/rss.xml in tests/contract/test_rss_feed.py
- [x] T012 [P] Contract test GET /api/feeds/{slug}/episodes in tests/contract/test_episodes_list.py
- [x] T013 [P] Integration test content submission flow in tests/integration/test_submission_flow.py
- [x] T014 [P] Integration test RSS feed generation in tests/integration/test_rss_generation.py
- [x] T015 [P] Integration test iOS Share Sheet in tests/integration/test_ios_integration.ts
- [x] T016 [P] Integration test n8n workflow processing in tests/integration/test_workflow_processing.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [x] T017 [P] ContentSubmission model in api/src/models/content-submission.ts
- [x] T018 [P] PodcastEpisode model in api/src/models/podcast-episode.ts
- [x] T019 [P] UserFeed model in api/src/models/user-feed.ts
- [x] T019B [P] Update data model for single public feed - remove UserFeed references and simplify architecture
- [x] T020 [P] ProcessingJob model in api/src/models/processing-job.ts
- [x] T021 [P] ContentExtractor service in api/src/services/content-extractor.ts
- [x] T022 [P] TTSService in api/src/services/tts-service.ts
- [x] T023 [P] RSSGenerator service in api/src/services/rss-generator.ts
- [x] T024 [P] StorageService in api/src/services/storage-service.ts
- [x] T025 POST /api/content Azure Function in api/src/functions/content-submission/
- [x] T026 GET /api/content/{id}/status Azure Function in api/src/functions/status-check/
- [x] T027 GET /api/feeds/{slug}/rss.xml Azure Function in api/src/functions/rss-feed/
- [x] T028 GET /api/feeds/{slug}/episodes Azure Function in api/src/functions/episodes-list/
- [x] T029 Input validation middleware in api/src/utils/validation.ts
- [x] T030 Error handling middleware in api/src/utils/error-handler.ts

## Phase 3.4: n8n Workflow Implementation
- [x] T031 [P] Content processing workflow in n8n-workflows/content-processing.json
- [x] T032 [P] YouTube extraction workflow in n8n-workflows/youtube-extraction.json
- [x] T033 [P] Document processing workflow in n8n-workflows/document-processing.json
- [x] T034 [P] TTS generation workflow in n8n-workflows/tts-generation.json
- [x] T035 [P] Error handling workflow in n8n-workflows/error-handling.json
- [x] T036 Configure n8n webhook endpoints and credentials
- [x] T037 Set up n8n workflow monitoring and logging
- [ ] T038 Test n8n workflow execution with sample content

## Phase 3.5: iOS Integration
- [x] T039 [P] iOS Share Sheet extension - **CANCELLED** (moved to webhook approach)
- [x] T040 [P] iOS Share Sheet configuration - **CANCELLED** (moved to webhook approach)
- [x] T041 [P] iOS Shortcuts integration - **CANCELLED** (moved to webhook approach)
- [x] T042 [P] iOS Share Sheet UI components - **CANCELLED** (moved to webhook approach)
- [x] T043 [P] iOS Share Sheet networking - **CANCELLED** (moved to webhook approach)
- [x] T044 Configure iOS Share Sheet app groups and entitlements
- [x] T045 Test iOS Share Sheet with various content types
- [x] T046 Test iOS Shortcuts automation workflows

## Phase 3.5.1: iOS Native Development (CANCELLED)
- [x] T091 Build iOS project in Xcode
- [x] T092 Configure code signing and provisioning profiles
- [cancelled] T093 Test iOS Share Sheet on physical device
- [cancelled] T094 Archive iOS app for distribution
- [cancelled] T095 Deploy to TestFlight for beta testing
- [cancelled] T096 Submit to App Store for review

**Note:** Phase 3.5.1 cancelled in favor of webhook-based approach (Phase 3.5.2)

## Phase 3.5.2: iOS Shortcuts + Webhook Integration
- [x] T097 Create webhook endpoint for iOS Shortcuts integration
- [x] T098 Create iOS Shortcuts configuration guide
- [x] T099 Test webhook with iOS Shortcuts
- [x] T100 Ensure RSS feed updates with webhook submissions
- [x] T101 Remove iOS artifacts and clean up project structure

## Phase 3.6: Database Integration
- [x] T047 Connect models to PostgreSQL database
- [x] T048 Implement database migrations for all entities
- [x] T049 Set up database connection pooling for Azure Functions
- [x] T050 Configure database indexes for performance
- [x] T051 Implement data retention policies (90-day cleanup)
- [x] T052 Set up database monitoring and backup
- [cancelled] T053 Test database operations under load - **CANCELLED** (single-user system, load testing unnecessary)

## Phase 3.7: External Service Integration
- [x] T054 [P] Firecrawl API integration in api/src/services/firecrawl-service.ts
- [x] T055 [P] Azure OpenAI integration in api/src/services/azure-openai-service.ts
- [x] T056 [P] ElevenLabs API integration in api/src/services/elevenlabs-service.ts
- [x] T057 [P] YouTube API integration in api/src/services/youtube-service.ts
- [x] T058 [P] Whisper API integration in api/src/services/whisper-service.ts
- [x] T059 Configure API keys and credentials securely
- [x] T060 Implement retry logic and error handling for all services
- [DEFERRED] T061 Set up service monitoring and alerting (circuit breaker test issues - 36/39 tests passing)

## Phase 3.8: Storage and CDN
- [x] T062 [P] Azure Blob Storage integration in api/src/services/blob-storage-service.ts
- [x] T063 [P] Azure CDN configuration for audio file distribution
- [x] T064 [P] File upload and download utilities in api/src/utils/file-utils.ts
- [x] T065 [P] Audio file processing utilities in api/src/utils/audio-utils.ts
- [x] T066 Configure storage lifecycle policies for cost optimization
- [ ] T067 Set up CDN caching rules and invalidation
- [ ] T068 Test file upload/download performance

## Phase 3.9: RSS Feed Implementation
- [ ] T069 [P] RSS XML generation in api/src/services/rss-generator.ts
- [ ] T070 [P] iTunes namespace compliance in api/src/utils/rss-utils.ts
- [ ] T071 [P] RSS feed validation in api/src/utils/rss-validator.ts
- [ ] T072 [P] Episode metadata formatting in api/src/utils/episode-utils.ts
- [ ] T073 Configure RSS feed caching and performance
- [ ] T074 Test RSS feed compatibility with podcast apps
- [ ] T075 Validate RSS feed against iTunes requirements

## Phase 3.10: Polish
- [ ] T076 [P] Unit tests for all services in tests/unit/
- [ ] T077 [P] Unit tests for all utilities in tests/unit/
- [ ] T078 [P] Unit tests for all models in tests/unit/
- [ ] T079 Performance tests for API endpoints
- [ ] T080 Performance tests for n8n workflows
- [ ] T081 Performance tests for iOS Share Sheet
- [ ] T082 [P] Update API documentation in docs/api.md
- [ ] T083 [P] Update deployment documentation in docs/deployment.md
- [ ] T084 [P] Update user guide in docs/user-guide.md
- [ ] T085 Remove code duplication and refactor
- [ ] T086 Run manual testing scenarios from quickstart.md
- [ ] T087 Security audit and penetration testing
- [ ] T088 Load testing with 10 concurrent users
- [ ] T089 End-to-end testing with real content
- [ ] T090 Production deployment and monitoring setup

## Dependencies
- Tests (T009-T016) before implementation (T017-T030)
- Models (T017-T020) before services (T021-T024)
- Services (T021-T024) before Azure Functions (T025-T028)
- Azure Functions (T025-T028) before n8n workflows (T031-T038)
- n8n workflows (T031-T038) before iOS integration (T039-T046)
- Database setup (T047-T053) before external services (T054-T061)
- External services (T054-T061) before storage (T062-T068)
- Storage (T062-T068) before RSS feeds (T069-T075)
- All implementation before polish (T076-T090)

## Parallel Examples

### Launch T009-T016 together (Contract Tests):
```
Task: "Contract test POST /api/content in tests/contract/test_content_submission.py"
Task: "Contract test GET /api/content/{id}/status in tests/contract/test_status_check.py"
Task: "Contract test GET /api/feeds/{slug}/rss.xml in tests/contract/test_rss_feed.py"
Task: "Contract test GET /api/feeds/{slug}/episodes in tests/contract/test_episodes_list.py"
Task: "Integration test content submission flow in tests/integration/test_submission_flow.py"
Task: "Integration test RSS feed generation in tests/integration/test_rss_generation.py"
Task: "Integration test iOS Share Sheet in tests/integration/test_ios_integration.py"
Task: "Integration test n8n workflow processing in tests/integration/test_workflow_processing.py"
```

### Launch T017-T024 together (Models and Services):
```
Task: "ContentSubmission model in api/src/models/content-submission.ts"
Task: "PodcastEpisode model in api/src/models/podcast-episode.ts"
Task: "UserFeed model in api/src/models/user-feed.ts"
Task: "ProcessingJob model in api/src/models/processing-job.ts"
Task: "ContentExtractor service in api/src/services/content-extractor.ts"
Task: "TTSService in api/src/services/tts-service.ts"
Task: "RSSGenerator service in api/src/services/rss-generator.ts"
Task: "StorageService in api/src/services/storage-service.ts"
```

### Launch T031-T035 together (n8n Workflows):
```
Task: "Content processing workflow in n8n-workflows/content-processing.json"
Task: "YouTube extraction workflow in n8n-workflows/youtube-extraction.json"
Task: "Document processing workflow in n8n-workflows/document-processing.json"
Task: "TTS generation workflow in n8n-workflows/tts-generation.json"
Task: "Error handling workflow in n8n-workflows/error-handling.json"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts
- Follow TDD approach: tests first, then implementation
- Use Azure Functions best practices
- Ensure n8n workflows are properly configured
- Test iOS Share Sheet on real devices
- Validate RSS feeds with podcast apps

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Workflows → iOS → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests
- [x] All entities have model tasks
- [x] All tests come before implementation
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] n8n workflows properly integrated
- [x] iOS Share Sheet tasks included
- [x] External service integrations covered
- [x] RSS feed implementation complete
