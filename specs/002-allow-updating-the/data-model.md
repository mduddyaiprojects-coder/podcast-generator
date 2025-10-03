# Data Model: Branding, Health, Voice, and Script Policy

**Feature**: 002-allow-updating-the  
**Date**: 2025-09-29

## Entities

### PodcastBranding
- id (uuid)
- title (string, required)
- image_url (string, required)
- image_meta (json: width, height, format, color_space)
- updated_at (timestamp)
- updated_by (string/user-id or system)

Validation
- image must be square, 1400–3000 px, JPEG/PNG, RGB

### DistributionSurface
- id (uuid)
- name (enum: rss, youtube)
- last_synced_at (timestamp)
- status (enum: ok, degraded, failed)
- notes (string)

### HealthCheck
- id (uuid)
- name (enum: youtube_processing, document_ingestion)
- status (enum: ok, degraded, failed)
- message (string)
- last_success_at (timestamp)
- last_checked_at (timestamp)

### Heartbeat
- id (uuid)
- status (enum: ok, degraded, failed)
- timestamp (timestamp)
- details (json)

### VoiceProfile
- id (uuid)
- display_name (string)
- locale (string)
- style_tags (string[])
- availability (enum: available, limited, unavailable)
- preview_url (string)

### ScriptPolicy
- id (uuid)
- tone_default (string)
- length_min_minutes (int)
- length_max_minutes (int)
- structure (json: intro, points, recap, outro)

## Relationships
- PodcastBranding is referenced by DistributionSurface sync logic and RSS generation
- HealthCheck and Heartbeat are surfaced to authorized users
- VoiceProfile referenced during TTS selection with deterministic fallback
- ScriptPolicy referenced by script generation pipeline
