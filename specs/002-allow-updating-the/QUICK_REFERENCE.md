# Quick Reference: Database → Blob Storage Refactoring

**Decision:** Choice C - Remove database, use blob storage for branding persistence  
**Status:** ✅ Tasks updated, ready for implementation  
**Next Step:** Proceed with T030 (Create BrandingService)

---

## What Changed

### Before (Database Approach)
```
┌─────────────────────────────────────────────────────┐
│  Podcast Generator Architecture (WITH Database)     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  API Functions                                       │
│  ├── branding-put.ts ──┐                            │
│  ├── branding-get.ts   │                            │
│  └── ...               │                            │
│                        │                             │
│                        ▼                             │
│  Services          DatabaseService                   │
│  ├── storage.ts    ├── getBranding()                │
│  └── ...           └── updateBranding()             │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────┐               │
│  │   PostgreSQL Database            │               │
│  │   ├── global_feed table          │               │
│  │   │   ├── title                  │               │
│  │   │   ├── artwork_url            │               │
│  │   │   └── updated_at             │               │
│  │   └── ...                        │               │
│  └──────────────────────────────────┘               │
│      Cost: $13-15/month                              │
│      Setup: Days (deploy + schema)                   │
│      Latency: 50-200ms reads                         │
└─────────────────────────────────────────────────────┘
```

### After (Blob Storage Approach)
```
┌─────────────────────────────────────────────────────┐
│  Podcast Generator Architecture (NO Database)       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  API Functions                                       │
│  ├── branding-put.ts ──┐                            │
│  ├── branding-get.ts   │                            │
│  └── ...               │                            │
│                        │                             │
│                        ▼                             │
│  Services          BrandingService  ⭐ NEW           │
│  ├── storage.ts    ├── getBranding()                │
│  └── ...           └── updateBranding()             │
│                        │                             │
│                        ▼                             │
│  ┌──────────────────────────────────┐               │
│  │   Azure Blob Storage             │               │
│  │   ├── audio/                     │               │
│  │   ├── transcripts/               │               │
│  │   └── config/                    │               │
│  │       └── branding.json ⭐ NEW   │               │
│  │           { title, imageUrl,     │               │
│  │             updatedAt }          │               │
│  └──────────────────────────────────┘               │
│      Cost: <$1/month                                 │
│      Setup: Hours (code only)                        │
│      Latency: <50ms reads                            │
└─────────────────────────────────────────────────────┘
```

---

## Task Changes Summary

### Phase 3.4 - Integration
| Task | Before | After |
|------|--------|-------|
| T022 | ✅ Persist to database | ⚠️ **REFACTORED** - Persist to blob storage |

### Phase 3.6 - Deployment & Verification
| Task | Before (Database) | After (Blob Storage) |
|------|-------------------|----------------------|
| T030 | Deploy PostgreSQL to Azure | **Create BrandingService (blob)** |
| T031 | Deploy database schema | **Refactor branding-put.ts** |
| T032 | Configure DATABASE_URL | **Create branding-get.ts** |
| T033 | Verify DB connectivity | **Update test mocks** |
| T034 | Run E2E tests | **Deploy to Azure (no DB)** |
| T035 | Verify RSS feed | **Run E2E verification** |
| T036 | Monitor DB performance | **Verify blob performance** |

---

## Implementation Checklist

### T030: Create BrandingService ⭐
- [ ] Create `api/src/services/branding-service.ts`
- [ ] Implement `getBranding()` method
- [ ] Implement `updateBranding()` method
- [ ] Use `@azure/storage-blob` package
- [ ] Store at `config/branding.json`
- [ ] Return defaults if blob missing
- [ ] Write unit tests

### T031: Refactor branding-put.ts
- [ ] Remove `DatabaseService` import
- [ ] Add `BrandingService` import
- [ ] Replace `getDatabaseService()` with `getBrandingService()`
- [ ] Update `applyBrandingUpdate()` to use BrandingService
- [ ] Update `getCurrentBranding()` to use BrandingService
- [ ] Keep all validation/security/logging
- [ ] Test locally

### T032: Create branding-get.ts
- [ ] Create `api/src/functions/branding-get.ts`
- [ ] Implement GET endpoint
- [ ] Use BrandingService
- [ ] Return current branding or defaults
- [ ] Add error handling
- [ ] Register route in function.json
- [ ] Write contract tests

### T033: Update Tests
- [ ] Update `branding.put.test.ts` mocks
- [ ] Update `feed-branding.test.ts` mocks
- [ ] Add `branding.get.test.ts` tests
- [ ] Remove database mocks
- [ ] Add blob storage mocks
- [ ] Run all tests

### T034: Deploy to Azure
- [ ] Build: `npm run build`
- [ ] Test: `npm test`
- [ ] Deploy: `func azure functionapp publish podcast-gen-api`
- [ ] Verify: Check function app status
- [ ] Remove: DATABASE_URL env var (if present)
- [ ] Confirm: AZURE_STORAGE_CONNECTION_STRING set

### T035: E2E Verification
- [ ] Test: GET /heartbeat
- [ ] Test: GET /health/youtube
- [ ] Test: GET /health/doc-ingest
- [ ] Test: GET /branding (returns defaults or current)
- [ ] Test: PUT /branding (update title)
- [ ] Test: PUT /branding (update imageUrl)
- [ ] Test: GET /branding (verify persistence)
- [ ] Verify: Validation errors work
- [ ] Check: Blob exists in Azure Portal

### T036: Performance Verification
- [ ] Measure: GET /branding response times
- [ ] Measure: PUT /branding response times
- [ ] Target: <500ms GET (p95)
- [ ] Target: <1s PUT (p95)
- [ ] Monitor: Blob storage metrics
- [ ] Document: Performance report
- [ ] Optimize: Add caching if needed

---

## Key Benefits

| Aspect | Improvement |
|--------|-------------|
| **Cost** | $15/month → <$1/month |
| **Deployment** | Days → Hours |
| **Complexity** | High → Low |
| **Performance** | 2-4x faster reads |
| **Maintenance** | Database backups/patching → None |
| **Consistency** | All content in blob storage |

---

## Files to Create/Modify

### New Files:
- ✅ `BLOB_STORAGE_REFACTORING_SUMMARY.md` (this document's companion)
- ✅ `REFACTORING_COMPLETE.md` (detailed summary)
- ✅ `QUICK_REFERENCE.md` (this file)
- ⏳ `api/src/services/branding-service.ts` (T030)
- ⏳ `api/src/functions/branding-get.ts` (T032)
- ⏳ `api/tests/unit/branding-service.test.ts` (T030)
- ⏳ `api/tests/contract/branding.get.test.ts` (T032)

### Modified Files:
- ✅ `specs/002-allow-updating-the/tasks.md` (updated T022, T030-T036)
- ⏳ `api/src/functions/branding-put.ts` (T031)
- ⏳ `api/tests/contract/branding.put.test.ts` (T033)
- ⏳ `api/tests/integration/feed-branding.test.ts` (T033)

### Unchanged Files (Database Still Available):
- ✅ `api/src/services/database-service.ts` (for episodes/jobs)
- ✅ `database/schemas/*.sql` (for future features)

---

## Commands Reference

### Local Development:
```bash
# Build
cd api && npm run build

# Run tests
npm test

# Run specific test
npm test -- branding-service.test.ts

# Start local dev server
func start
```

### Deployment:
```bash
# Deploy to Azure
func azure functionapp publish podcast-gen-api

# Check function app status
az functionapp show --name podcast-gen-api --resource-group podcast-generator-rg

# View logs
az functionapp log tail --name podcast-gen-api --resource-group podcast-generator-rg
```

### Verification:
```bash
# Test heartbeat
curl https://podcast-gen-api.azurewebsites.net/api/heartbeat

# Get branding
curl https://podcast-gen-api.azurewebsites.net/api/branding

# Update branding
curl -X PUT https://podcast-gen-api.azurewebsites.net/api/branding \
  -H "Content-Type: application/json" \
  -d '{"title": "My Podcast"}'

# Check blob storage
az storage blob list \
  --account-name <account> \
  --container-name <container> \
  --prefix "config/branding.json"
```

---

## Documentation Files

1. **QUICK_REFERENCE.md** (this file) - Quick overview and checklist
2. **BLOB_STORAGE_REFACTORING_SUMMARY.md** - Full technical analysis and decision rationale
3. **REFACTORING_COMPLETE.md** - Detailed summary of changes made
4. **tasks.md** - Updated implementation tasks (T030-T036)

**Read these in order:**
1. Start here (QUICK_REFERENCE.md) for overview
2. Review tasks.md for T030-T036 details
3. Read BLOB_STORAGE_REFACTORING_SUMMARY.md for full context
4. Refer to REFACTORING_COMPLETE.md for change summary

---

## Decision Summary

**Question:** "Do we need a database for branding persistence?"

**Answer:** No. Branding is a simple key-value use case (title, imageUrl, updatedAt). Blob storage is:
- ✅ Simpler (no database deployment)
- ✅ Cheaper (<$1/month vs $15/month)
- ✅ Faster (2-4x performance)
- ✅ Consistent (same storage as audio/transcripts)
- ✅ Already deployed and working

**Database still useful for:** Episodes, submissions, jobs (complex queries, relationships)

**Recommendation:** Proceed with blob storage for branding (Choice C)

---

## Next Steps

1. **Review** this document and BLOB_STORAGE_REFACTORING_SUMMARY.md
2. **Approve** the refactoring approach
3. **Assign** T030 to agent
4. **Monitor** progress through checklist above
5. **Deploy** after T033 tests pass
6. **Verify** with T035-T036

**Timeline:** 1-2 days for T030-T036 complete

---

**Status:** ✅ Ready to implement  
**Blocker:** None (all prerequisites met)  
**Next:** T030 - Create BrandingService
