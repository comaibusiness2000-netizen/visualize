# Visualize App Store Production Architecture

This file defines the production changes required before Visualize can support real iOS users at scale.

## Product Boundary

The current web preview is a UX prototype. A true App Store build needs a native app plus a backend. The app can keep local caching for offline use, but user-owned data must sync through account-based cloud storage.

## Recommended Stack

- Auth: Sign in with Apple.
- Database: Supabase Postgres or Firebase Firestore.
- Image storage: private object storage such as Supabase Storage, Firebase Storage, or S3-compatible storage.
- AI: server-side image generation/editing and script generation.
- Payments: Apple In-App Purchase with server-side entitlement validation.
- Analytics: privacy-aware events only, no raw goals or private prompts in analytics.

## Core Data Model

### users

- id
- apple_user_id
- email_hash
- created_at
- deleted_at

### goals

- id
- user_id
- type: daily_task, short_term_goal, long_term_goal
- title
- progress
- sort_order
- created_at
- updated_at

### decks

- id
- user_id
- kind: vision, anti_vision
- title
- created_at
- updated_at

### slides

- id
- deck_id
- sort_order
- title
- caption
- image_object_key
- image_width
- image_height
- source: upload, ai_generated, ai_edited
- ai_job_id
- created_at
- updated_at

### ai_jobs

- id
- user_id
- kind: image_generation, image_edit, script_generation
- status: queued, running, succeeded, failed
- prompt
- input_image_object_key
- output_image_object_key
- provider
- cost_estimate_cents
- created_at
- completed_at

### audio_scripts

- id
- user_id
- title
- script_text
- voice
- speed
- created_at
- updated_at

### subscriptions

- id
- user_id
- apple_original_transaction_id
- product_id
- status
- expires_at
- updated_at

## Required Backend Endpoints

- POST /auth/apple/session
- GET /me
- GET /sync/bootstrap
- POST /goals
- PATCH /goals/:id
- DELETE /goals/:id
- POST /decks
- PATCH /decks/:id
- POST /decks/:id/slides
- PATCH /slides/:id
- DELETE /slides/:id
- POST /uploads/presign
- POST /ai/images
- POST /ai/image-edits
- POST /ai/scripts
- POST /iap/verify
- POST /iap/apple-notifications
- DELETE /account

## Image Cost Controls

- Compress client-side before upload.
- Reject files above the server limit.
- Store only optimized images for playback.
- Cap the number of slides per deck by plan.
- Track AI job usage per user and subscription tier.
- Use private signed URLs instead of public image URLs.

## Privacy Requirements

- Never embed AI provider keys in the app.
- Keep images private by default.
- Give users deletion/export flows before App Store submission.
- Do not send private goals/prompts to analytics.
- Add clear consent for AI image editing and AI generation.

## App Store Payment Boundary

The iOS app must use Apple In-App Purchase for digital premium features. The backend should verify receipts and Apple server notifications, then return entitlement state to the app. The client should not trust local purchase state alone.

## Migration From Prototype

1. Keep the current local save as offline cache.
2. Add native Sign in with Apple.
3. Replace local image-only storage with object storage uploads.
4. Sync goals, decks, slides, scripts, and settings through the backend.
5. Move AI generation/editing behind server endpoints.
6. Add Apple IAP and entitlement checks.
7. Complete privacy policy and deletion/export flows.
