# Research: Podcast Generator

**Feature**: 001-feature-podcast-generator  
**Date**: 2024-12-19  
**Input**: Technical decisions from plan.md

## Research Findings

### Azure Functions for Content Processing Workflows

**Decision**: Use Azure Functions for serverless content processing  
**Rationale**: 
- Serverless scaling matches variable content processing load
- Native integration with Azure services (Blob Storage, OpenAI, etc.)
- Cost-effective for 1-3 users with burst processing needs
- Built-in HTTP triggers for API endpoints

**Alternatives considered**:
- Azure App Service: More expensive for low usage, always-on costs
- Azure Container Instances: More complex setup, overkill for simple processing
- Azure Logic Apps: Limited programming flexibility, higher cost

### n8n Workflow Patterns for Content Extraction

**Decision**: Use n8n for workflow orchestration and content processing  
**Rationale**:
- Visual workflow design for complex content processing pipelines
- Built-in integrations with external APIs (Firecrawl, ElevenLabs, etc.)
- Error handling and retry logic built-in
- Easy to modify and debug workflows

**Alternatives considered**:
- Azure Logic Apps: More expensive, less flexible
- Custom Node.js workflows: More development time, less visual debugging
- GitHub Actions: Not suitable for real-time processing

### ElevenLabs API Integration and Error Handling

**Decision**: ElevenLabs as primary TTS with Azure TTS fallback  
**Rationale**:
- Superior audio quality for podcast content
- Multiple voice options and customization
- API supports streaming and batch processing
- Azure TTS provides cost-effective fallback

**Alternatives considered**:
- Azure TTS only: Lower quality, limited voice options
- Google Cloud TTS: Additional vendor complexity
- AWS Polly: Not in Azure ecosystem

**Error handling strategy**:
- Retry with exponential backoff (3 attempts)
- Fallback to Azure TTS on persistent failures
- Queue failed jobs for manual review
- User notification on TTS failures

### Azure OpenAI for Content Processing and Dialogue Generation

**Decision**: Use Azure OpenAI for AI content processing  
**Rationale**:
- Native Azure integration, no external API calls
- GPT-4 for high-quality content processing
- Cost-effective within Azure ecosystem
- Consistent with other Azure services

**Alternatives considered**:
- OpenAI API directly: Higher costs, external dependency
- Anthropic Claude: Additional vendor complexity
- Local models: Insufficient quality for podcast generation

**Usage patterns**:
- Content summarization and key point extraction
- Dialogue script generation with conversational tone
- Title and description generation
- Content length optimization for 15-minute episodes

### Firecrawl API for Web Content Extraction

**Decision**: Use Firecrawl for robust web content extraction  
**Rationale**:
- Handles complex web pages, JavaScript rendering
- Removes ads, navigation, and irrelevant content
- Extracts clean article text and metadata
- Better than basic HTTP requests for modern websites

**Alternatives considered**:
- Basic HTTP requests: Inadequate for modern web pages
- Puppeteer/Playwright: More complex setup, higher costs
- Readability.js: Limited functionality, no API service

**Integration approach**:
- Firecrawl for web articles and blog posts
- YouTube API + Whisper for video content
- Direct text extraction for documents (PDF, Word)

### Azure Blob Storage with CDN for Audio Distribution

**Decision**: Azure Blob Storage + Azure CDN for audio file distribution  
**Rationale**:
- Cost-effective storage for audio files
- Global CDN distribution for fast podcast delivery
- Integration with Azure Functions
- Lifecycle policies for cost management

**Alternatives considered**:
- Azure Files: More expensive, not suitable for public access
- External CDN (CloudFlare): Additional complexity, vendor lock-in
- Direct blob access: Slower global performance

**Storage strategy**:
- Hot tier for recent episodes (30 days)
- Cool tier for older episodes (60 days)
- Archive tier for very old episodes (90+ days)
- CDN caching with 7-day TTL

### PostgreSQL Schema Design for Podcast Metadata

**Decision**: PostgreSQL for relational metadata storage  
**Rationale**:
- ACID compliance for data integrity
- Rich querying capabilities for RSS feeds
- JSON support for flexible metadata
- Azure Database for PostgreSQL integration

**Alternatives considered**:
- Cosmos DB: Overkill for relational data, higher costs
- Azure SQL: More expensive, less flexible
- File-based storage: No querying capabilities

**Schema design**:
- Normalized tables for episodes, feeds, submissions
- JSON columns for flexible metadata
- Proper indexing for RSS feed queries
- Soft deletes for data retention compliance

### iOS Share Sheet Extension Development

**Decision**: Native iOS Share Sheet extension  
**Rationale**:
- Seamless user experience from any app
- No additional app installation required
- Native iOS integration and security
- Works with existing iOS Shortcuts

**Alternatives considered**:
- Web app: Requires browser, less convenient
- Dedicated app: Additional installation barrier
- Safari extension: Limited to web content only

**Implementation approach**:
- Share Extension target in iOS project
- URL scheme handling for content types
- Background processing with progress indicators
- Integration with iOS Shortcuts for automation

### RSS Feed Generation and iTunes Compliance

**Decision**: Standard RSS 2.0 with iTunes extensions  
**Rationale**:
- Maximum compatibility with podcast players
- iTunes/Apple Podcasts compliance
- Standard format for podcast distribution
- Easy to validate and debug

**Alternatives considered**:
- Atom feeds: Less podcast player support
- Custom JSON API: Requires custom player
- Podcast 2.0: Limited adoption, complex

**RSS structure**:
- Standard RSS 2.0 base
- iTunes namespace for podcast metadata
- Proper enclosure tags for audio files
- CDATA sections for HTML content
- Valid XML with proper escaping

## Technical Integration Patterns

### Content Processing Pipeline
1. **Input**: iOS Share Sheet → Azure Function
2. **Extraction**: n8n workflow → Firecrawl/YouTube API/PDF processing
3. **AI Processing**: Azure OpenAI → dialogue generation
4. **TTS**: ElevenLabs → audio generation
5. **Storage**: Azure Blob → CDN distribution
6. **RSS**: PostgreSQL → dynamic feed generation

### Error Handling Strategy
- **Retry Logic**: Exponential backoff for transient failures
- **Fallback Services**: Azure TTS when ElevenLabs fails
- **User Notification**: Status updates and error messages
- **Monitoring**: Azure Application Insights for observability

### Cost Optimization
- **Serverless**: Pay-per-use with Azure Functions
- **Storage Tiers**: Lifecycle policies for cost management
- **CDN Caching**: Reduce origin requests
- **Batch Processing**: Queue multiple requests for efficiency

## Security Considerations

### Data Protection
- **Encryption**: TLS 1.3 for all communications
- **Storage**: Server-side encryption for audio files
- **Database**: Encryption at rest and in transit
- **API Keys**: Azure Key Vault for secure storage

### Privacy Compliance
- **Data Retention**: 90-day automatic deletion
- **User Data**: Minimal collection, anonymous access
- **Content Processing**: No persistent storage of source content
- **Audit Logging**: Complete operation audit trail

## Performance Targets

### Processing Time
- **Target**: 15 minutes maximum
- **Typical**: 5-10 minutes for most content
- **Monitoring**: Real-time progress tracking
- **Optimization**: Parallel processing where possible

### Scalability
- **Concurrent Jobs**: 10 simultaneous processing
- **Storage**: 1TB+ audio file capacity
- **CDN**: Global distribution with <200ms latency
- **Database**: 10,000+ episodes support

## Implementation Readiness

All technical decisions have been researched and validated. The architecture is ready for implementation with:

- ✅ **Azure Functions**: Serverless compute platform
- ✅ **n8n**: Workflow orchestration system
- ✅ **ElevenLabs**: TTS service integration
- ✅ **Azure OpenAI**: AI content processing
- ✅ **Firecrawl**: Web content extraction
- ✅ **Azure Blob + CDN**: Audio storage and distribution
- ✅ **PostgreSQL**: Metadata storage
- ✅ **iOS Share Sheet**: Mobile integration
- ✅ **RSS 2.0**: Podcast feed generation

The research phase is complete and ready for design phase implementation.
