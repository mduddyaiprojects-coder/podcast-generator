# 🚀 DEPLOYMENT READY - Pre-Deployment Checklist

**Date:** January 2, 2025
**Task:** T035 Complete - Ready for T036 Deployment
**API Build:** ✅ SUCCESSFUL
**Database Cleanup:** ✅ COMPLETE

---

## ✅ Pre-Deployment Verification Complete

### Build Status
- [x] TypeScript compilation successful (0 errors)
- [x] All active code compiles cleanly
- [x] Output generated in `dist/` folder
- [x] Branding functions compiled:
  - `dist/functions/branding-get.js` ✅
  - `dist/functions/branding-put.js` ✅
  - `dist/services/branding-service.js` ✅

### Database Cleanup
- [x] All database imports removed from active code
- [x] Database-dependent files deprecated (8 files)
- [x] No `database-service` references in active code
- [x] Build succeeds without `pg` or `@types/pg`

### Test Status
- [x] BrandingService unit tests: 26/26 passing
- [x] No failing tests blocking deployment
- [x] All mocks updated for blob storage

### Code Quality
- [x] No TypeScript errors
- [x] No compilation warnings
- [x] Clean separation of active vs deprecated code
- [x] Single persistence strategy (blob storage only)

---

## 📦 What's Being Deployed

### Active Endpoints (Feature 002)
1. **GET /api/heartbeat** - Health check with timestamp
2. **GET /api/health/youtube** - YouTube integration status
3. **GET /api/health/doc-ingest** - Document ingestion status
4. **GET /api/branding** - Get current podcast branding
5. **PUT /api/branding** - Update podcast branding

### Key Features
- ✅ Blob storage persistence (no database)
- ✅ Last-Write-Wins conflict resolution
- ✅ Image validation (JPEG/PNG, 1400-3000px, HTTPS)
- ✅ SSRF protection (no private IPs)
- ✅ Content-Type validation
- ✅ Logging and telemetry
- ✅ Error handling

### Storage Architecture
```
Azure Blob Storage
└── config/
    └── branding.json    # { title, imageUrl, updatedAt }
```

---

## 🎯 Deployment Instructions

### Option 1: Azure Functions Core Tools (Recommended)
```bash
cd /Users/michaelduddy/Documents/GitHub/podcast-generator/api
func azure functionapp publish podcast-gen-api
```

### Option 2: Azure CLI with Zip Deploy
```bash
cd /Users/michaelduddy/Documents/GitHub/podcast-generator/api
npm run build
zip -r ../api-deploy.zip dist/ package.json host.json
cd ..
az functionapp deployment source config-zip \
  --resource-group podcast-generator-rg \
  --name podcast-gen-api \
  --src api-deploy.zip
```

### Option 3: GitHub Actions (if configured)
```bash
git add .
git commit -m "feat: complete database cleanup for Feature 002"
git push origin 002-allow-updating-the
# Then trigger deployment workflow
```

---

## ⚙️ Environment Variables to Verify

### Required (Must Be Set)
- `AZURE_STORAGE_CONNECTION_STRING` - For blob storage access

### Should Be Removed
- `DATABASE_URL` - No longer needed (database removed)

### Optional (For Full Feature Set)
- `AZURE_OPENAI_ENDPOINT` - For content generation
- `AZURE_OPENAI_API_KEY` - For content generation
- `ELEVENLABS_API_KEY` - For TTS
- `FIRECRAWL_API_KEY` - For web scraping
- `YOUTUBE_API_KEY` - For YouTube integration

**Verify with Azure CLI:**
```bash
# List all app settings
az functionapp config appsettings list \
  --name podcast-gen-api \
  --resource-group podcast-generator-rg \
  --output table

# Check for AZURE_STORAGE_CONNECTION_STRING
az functionapp config appsettings list \
  --name podcast-gen-api \
  --resource-group podcast-generator-rg \
  --query "[?name=='AZURE_STORAGE_CONNECTION_STRING'].name"

# Remove DATABASE_URL if present
az functionapp config appsettings delete \
  --name podcast-gen-api \
  --resource-group podcast-generator-rg \
  --setting-names DATABASE_URL
```

---

## 🧪 Post-Deployment Verification (T037)

After deployment, run these tests to verify everything works:

### 1. Health Checks
```bash
# Heartbeat
curl https://podcast-gen-api.azurewebsites.net/api/heartbeat

# YouTube health
curl https://podcast-gen-api.azurewebsites.net/api/health/youtube

# Doc ingestion health
curl https://podcast-gen-api.azurewebsites.net/api/health/doc-ingest
```

### 2. Branding GET
```bash
curl https://podcast-gen-api.azurewebsites.net/api/branding
```

Expected: `{ "title": "...", "imageUrl": "...", "updatedAt": "..." }`

### 3. Branding PUT - Title Only
```bash
curl -X PUT https://podcast-gen-api.azurewebsites.net/api/branding \
  -H "Content-Type: application/json" \
  -d '{"title": "My Test Podcast"}'
```

### 4. Branding PUT - Image Only
```bash
curl -X PUT https://podcast-gen-api.azurewebsites.net/api/branding \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/artwork.jpg"}'
```

### 5. Branding PUT - Both Fields
```bash
curl -X PUT https://podcast-gen-api.azurewebsites.net/api/branding \
  -H "Content-Type: application/json" \
  -d '{"title": "Complete Branding", "imageUrl": "https://example.com/final.jpg"}'
```

### 6. Verify Persistence
```bash
# Update branding
curl -X PUT https://podcast-gen-api.azurewebsites.net/api/branding \
  -H "Content-Type: application/json" \
  -d '{"title": "Persistence Test"}'

# Get it back (should match)
curl https://podcast-gen-api.azurewebsites.net/api/branding
```

### 7. Validation Tests (Should Fail)
```bash
# Missing Content-Type (should return 400)
curl -X PUT https://podcast-gen-api.azurewebsites.net/api/branding \
  -d '{"title": "Test"}'

# HTTP instead of HTTPS (should return 400)
curl -X PUT https://podcast-gen-api.azurewebsites.net/api/branding \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "http://insecure.com/image.jpg"}'

# Private IP - SSRF protection (should return 400)
curl -X PUT https://podcast-gen-api.azurewebsites.net/api/branding \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://192.168.1.1/image.jpg"}'
```

---

## 📊 Success Criteria

### Deployment Success
- ✅ Function app shows "Running" status in Azure Portal
- ✅ No deployment errors in logs
- ✅ All functions registered and accessible
- ✅ No database connection errors

### Functional Success
- ✅ All health endpoints return 200 OK
- ✅ GET /api/branding returns valid JSON
- ✅ PUT /api/branding accepts valid updates
- ✅ Branding persists across requests
- ✅ Validation rejects invalid inputs

### Performance Success (T038)
- ✅ GET /api/branding: <500ms p95
- ✅ PUT /api/branding: <1s p95
- ✅ Health endpoints: <1s p95
- ✅ Blob storage latency: <100ms

---

## 🚨 Rollback Plan (If Needed)

If deployment fails or critical issues found:

### Option 1: Revert to Previous Deployment
```bash
# Using deployment slots (if configured)
az functionapp deployment slot swap \
  --resource-group podcast-generator-rg \
  --name podcast-gen-api \
  --slot staging \
  --target-slot production
```

### Option 2: Redeploy Previous Git Commit
```bash
git checkout <previous-commit-sha>
cd api
npm run build
func azure functionapp publish podcast-gen-api
```

### Option 3: Restore Database (NOT APPLICABLE)
Database has been removed - no restoration needed. All data in blob storage.

---

## 📝 Known Considerations

### What's NOT Deployed
These deprecated files are in the repo but not included in the build:
- `clear-old-episodes.ts.DEPRECATED` - Episode cleanup utility
- `episodes-list-v2.ts.DEPRECATED` - Episode listing
- `fix-audio-urls.ts.DEPRECATED` - URL migration
- `data-retention-cleanup.ts.DEPRECATED` - Data lifecycle
- `database-service.ts.DEPRECATED` - PostgreSQL service
- `data-retention-service.ts.DEPRECATED` - Retention policies
- `processing-job-service.ts.DEPRECATED` - Job tracking

### Future Cleanup (Optional)
After Feature 002 is fully validated in production:
1. Consider removing `.DEPRECATED` files entirely
2. Update documentation to reflect blob-only architecture
3. Remove any database-related environment variable documentation

---

## 🎬 Ready to Deploy!

**Current Status:** 🟢 ALL SYSTEMS GO

**Build:** ✅ Clean
**Tests:** ✅ Passing
**Database:** ✅ Removed
**Documentation:** ✅ Updated

**Next Action:** Deploy to Azure Functions (T036)

**Command to Run:**
```bash
cd /Users/michaelduddy/Documents/GitHub/podcast-generator/api
func azure functionapp publish podcast-gen-api
```

**Then:** Wait for deployment completion and proceed to T037 (end-to-end verification).

---

## 📞 Support

If any issues during deployment:
1. Check Azure Portal logs: [Function App → Monitor → Logs]
2. Check Application Insights for errors
3. Verify environment variables are set correctly
4. Review deployment output for error messages
5. Check blob storage connectivity

**Estimated Deployment Time:** 2-5 minutes

**Ready when you are!** 🚀
