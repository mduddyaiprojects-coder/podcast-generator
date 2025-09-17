# Podcast Generator 🎧

Convert any web content (URLs, YouTube videos, documents) into podcast episodes via iOS Share Sheet and listen through traditional podcast apps.

## 🚀 Quick Start

1. **Share Content**: Use iOS Share Sheet to send any URL, YouTube video, or document
2. **AI Processing**: Content is automatically converted to engaging podcast dialogue
3. **Listen**: Subscribe to your personal RSS feed in Apple Podcasts, Overcast, or Spotify

## ✨ Features

- **iOS Share Sheet Integration**: One-tap sharing from any app
- **Multi-Content Support**: URLs, YouTube videos, PDFs, documents
- **AI-Powered**: Azure OpenAI converts content to conversational dialogue
- **High-Quality Audio**: ElevenLabs TTS with Azure fallback
- **RSS Compliant**: Works with all major podcast apps
- **Fast Processing**: 15-minute maximum processing time
- **Anonymous Access**: No account required

## 🏗️ Architecture

- **Azure Functions**: Serverless API endpoints
- **n8n Workflows**: Content processing orchestration
- **Azure OpenAI**: AI content processing and dialogue generation
- **Firecrawl**: Robust web content extraction
- **ElevenLabs**: Premium text-to-speech
- **PostgreSQL**: Metadata storage
- **Azure Blob + CDN**: Audio file storage and distribution

## 📋 Specification

Complete specification and implementation plan available in `/specs/001-feature-podcast-generator/`:

- **Feature Specification**: 20 functional requirements
- **Implementation Plan**: Azure Functions + n8n + ElevenLabs architecture
- **Research**: Technical decisions and rationale
- **Data Model**: PostgreSQL schema design
- **API Contracts**: OpenAPI specifications
- **Tasks**: 90 detailed implementation tasks

## 🛠️ Development

This project uses the [Specify Framework](https://github.com/specify-framework/specify) for specification-driven development.

### Prerequisites

- Node.js 18+
- Azure Functions Core Tools
- n8n (workflow orchestration)
- PostgreSQL database
- Azure OpenAI API access
- ElevenLabs API access
- Firecrawl API access

### Getting Started

1. **Review Specification**: Read `/specs/001-feature-podcast-generator/spec.md`
2. **Follow Implementation Plan**: See `/specs/001-feature-podcast-generator/plan.md`
3. **Execute Tasks**: Start with `/specs/001-feature-podcast-generator/tasks.md`

## 📊 Status

- ✅ **Specification Complete**: Feature requirements defined
- ✅ **Architecture Designed**: Technical approach planned
- ✅ **Implementation Tasks**: 90 detailed tasks ready
- 🚧 **Implementation**: Ready to begin development

## 🤝 Contributing

This project follows specification-driven development. Please review the specification documents before contributing.

## 📄 License

MIT License - see LICENSE file for details.
