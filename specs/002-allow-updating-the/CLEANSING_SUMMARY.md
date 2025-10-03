# Database Cleansing - Quick Summary

## What We're Doing
**Removing all database dependencies from Feature 002 (branding updates) and using blob storage exclusively.**

---

## Why?
1. ✅ **Blob storage already works** for all podcast content
2. ✅ **Branding is simple key-value** data (title + imageUrl + timestamp)
3. ❌ **Database adds complexity** and cost without benefit
4. ✅ **Architecture consistency** - everything in blob storage

---

## What Changes

### Code Changes (3 files)
1. **NEW**: `api/src/services/branding-service.ts`
   - Read/write `config/branding.json` from blob storage
   - Replace DatabaseService branding methods

2. **UPDATE**: `api/src/functions/branding-put.ts`
   - Use BrandingService instead of DatabaseService
   - All validation, security, LWW policy unchanged

3. **NEW**: `api/src/functions/branding-get.ts`
   - GET endpoint for current branding
   - Returns defaults if not set

### Test Changes (2 files)
1. **UPDATE**: `api/tests/contract/branding.put.test.ts`
   - Mock BrandingService instead of DatabaseService

2. **NEW**: `api/tests/contract/branding.get.test.ts`
   - Test GET endpoint

### Documentation Changes (9 files)
1. **DELETE**: `T029-database-setup-guide.md`
2. **DELETE**: `DATABASE_REQUIREMENT_ANALYSIS_INDEX.md`
3. **DELETE**: `ARCHITECTURE_ANALYSIS_DATABASE_VS_STORAGE.md`
4. **DELETE**: `QUICK_REFERENCE_DATABASE_VS_STORAGE.md`
5. **DELETE**: `RECOMMENDATION_SUMMARY.md`
6. **UPDATE**: `tasks.md` - T022, T030-T036
7. **UPDATE**: `data-model.md` - Show blob storage structure
8. **UPDATE**: `spec.md` - Remove database from Key Entities
9. **UPDATE**: `README.md` - Remove database setup

---

## What Stays the Same

### NOT Changing (Feature 001 - out of scope)
- `database/` folder - Keep for future
- `api/src/services/database-service.ts` - Keep for Feature 001
- Episode management functions - Still use database
- Database schemas - Keep as reference

### Behavior Unchanged
- All API contracts identical
- All validation rules identical
- LWW policy works same way
- Security checks identical
- Performance targets identical

---

## Execution Plan

### Phase 1: Create BrandingService (30 min)
```typescript
// api/src/services/branding-service.ts
class BrandingService {
  async getBranding(): Promise<{ title, imageUrl, updatedAt }>
  async updateBranding(updates): Promise<{ title, imageUrl, updatedAt }>
}
// Stores in blob: config/branding.json
```

### Phase 2: Update Functions (30 min)
- Refactor `branding-put.ts` to use BrandingService
- Create `branding-get.ts` with BrandingService

### Phase 3: Update Tests (30 min)
- Mock BrandingService in tests
- Add GET endpoint tests
- Verify all pass

### Phase 4: Clean Docs (30 min)
- Delete 5 database-specific docs
- Update 4 core docs
- Simplify README

### Phase 5: Deploy (30 min)
- Deploy API to Azure
- Run verification tests
- Confirm no database errors

**Total Time: ~2.5 hours**

---

## Risk Assessment

### Risks: LOW ✅
- Blob storage proven to work
- Simple persistence pattern
- No complex queries needed
- Easy rollback if needed

### Mitigation
- Keep database code for Feature 001
- Thorough testing before deploy
- Monitor blob operations

---

## Success Criteria

- [ ] BrandingService working with blob storage
- [ ] All branding tests passing
- [ ] No DatabaseService in branding functions
- [ ] Database docs removed/updated
- [ ] API deployed successfully
- [ ] Branding endpoints working in production
- [ ] Performance targets met (<500ms GET, <1s PUT)

---

## Blob Storage Structure

```
Azure Blob Storage Container: podcast-content
├── episodes/
│   └── [episode-id]/
│       ├── audio.mp3
│       ├── transcript.txt
│       ├── script.txt
│       └── metadata.json
├── feed.xml
└── config/
    └── branding.json  ← Feature 002 persistence
```

### branding.json Format
```json
{
  "title": "AI Podcast Generator",
  "imageUrl": "https://example.com/artwork.jpg",
  "updatedAt": "2025-01-XX..."
}
```

---

## Architecture After Cleansing

```
┌────────────────────────────────────┐
│   Podcast Generator API             │
├────────────────────────────────────┤
│                                     │
│  Endpoints                          │
│  ├─ GET  /branding  ──┐             │
│  └─ PUT  /branding  ──┤             │
│                       │             │
│  Services             │             │
│  └─ BrandingService ──┘             │
│         │                           │
│         ▼                           │
│  ┌──────────────────┐               │
│  │  Blob Storage    │               │
│  │  config/         │               │
│  │  branding.json   │               │
│  └──────────────────┘               │
│                                     │
│  NO DATABASE NEEDED ✅              │
│                                     │
└────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Review DATABASE_CLEANSING_PLAN.md for full details
2. ⏳ Execute Phase 1-5 in sequence
3. ⏳ Test thoroughly
4. ⏳ Deploy to production
5. ⏳ Verify and close Feature 002

**Ready to proceed? Let's clean up this codebase! 🧹**

