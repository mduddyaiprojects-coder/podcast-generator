# Contract Tests

## Overview

Contract tests validate that API endpoints conform to their OpenAPI specifications. These are integration tests that run against a live API instance.

## Running Contract Tests

### Prerequisites

1. **Start the Azure Functions API**:
   ```bash
   cd api
   npm run dev
   ```
   The API should start on `http://localhost:7071`

2. **Verify the API is running**:
   ```bash
   curl http://localhost:7071/api/heartbeat
   ```

### Run All Contract Tests

```bash
npm test -- tests/contract/
```

### Run Specific Contract Test

```bash
# YouTube health check
npm test -- tests/contract/health.youtube.test.ts

# Document ingestion health check
npm test -- tests/contract/health.doc-ingest.test.ts

# Heartbeat
npm test -- tests/contract/heartbeat.test.ts

# Branding
npm test -- tests/contract/branding.put.test.ts
```

### Run with Custom API URL

If testing against a deployed instance:

```bash
API_BASE_URL=https://your-api.azurewebsites.net/api npm test -- tests/contract/
```

## Test Structure

Each contract test file follows this pattern:

```typescript
describe('GET /api/{endpoint} Contract Tests', () => {
  // Setup
  let client: AxiosInstance;

  // Response structure validation
  describe('Successful Response', () => {
    it('should return 200 status code', async () => { ... });
    it('should return JSON content type', async () => { ... });
    it('should include required fields', async () => { ... });
    it('should validate field types', async () => { ... });
  });

  // HTTP method validation
  describe('HTTP Method Validation', () => {
    it('should only accept allowed methods', async () => { ... });
  });

  // Performance requirements
  describe('Performance Requirements', () => {
    it('should respond within SLA', async () => { ... });
  });

  // OpenAPI compliance
  describe('OpenAPI Contract Compliance', () => {
    it('should match the OpenAPI schema exactly', async () => { ... });
  });
});
```

## Current Contract Tests

### Phase 3.2 (Feature 002)

- ✅ **T004**: `heartbeat.test.ts` - Server heartbeat endpoint
- ✅ **T005**: `health.youtube.test.ts` - YouTube health check
- [ ] **T006**: `health.doc-ingest.test.ts` - Document ingestion health check
- [ ] **T007**: `branding.put.test.ts` - Branding update endpoint

### Existing Tests

- `content_submission.test.ts` - Content submission endpoint
- `episodes_list.test.ts` - Episodes listing endpoint
- `rss_feed.test.ts` - RSS feed generation
- `status_check.test.ts` - System status check

## Test Assertions

Contract tests verify:

1. **HTTP Status Codes**: Correct status codes for success/error cases
2. **Response Headers**: Content-Type and other required headers
3. **Response Schema**: All required fields present with correct types
4. **Field Validation**: Enums, formats, constraints match spec
5. **HTTP Methods**: Only allowed methods accepted
6. **Performance**: Response times meet SLA requirements
7. **Error Handling**: Graceful handling of invalid inputs
8. **Idempotency**: Consistent responses for GET requests

## OpenAPI Specification

Contract tests validate against: `specs/002-allow-updating-the/contracts/openapi.yaml`

See the OpenAPI spec for detailed endpoint definitions.

## Troubleshooting

### Test Fails: ECONNREFUSED

**Problem**: Cannot connect to API
**Solution**: Make sure the Azure Functions API is running on port 7071

```bash
cd api
npm run dev
```

### Test Fails: Timeout

**Problem**: API not responding within timeout
**Solution**: Check API logs for errors, increase timeout in test if needed

### Test Fails: Schema Mismatch

**Problem**: Response doesn't match OpenAPI schema
**Solution**: This indicates the implementation doesn't match the contract. Either:
1. Fix the implementation to match the spec, or
2. Update the OpenAPI spec if the change is intentional

## CI/CD Integration

In CI/CD pipelines:

1. Deploy API to test environment
2. Wait for API to be ready
3. Run contract tests against deployed API
4. Report results

Example:
```bash
# In CI pipeline
npm run build
npm start &
sleep 5  # Wait for API to start
npm test -- tests/contract/
```

## Related Documentation

- [OpenAPI Specification](../../specs/002-allow-updating-the/contracts/openapi.yaml)
- [API Local Development](../README-local-dev.md)
- [Feature 002 Tasks](../../specs/002-allow-updating-the/tasks.md)
