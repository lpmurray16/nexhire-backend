# NexHire Backend

A PocketBase backend deployed to Fly.io for a multi-tenant recruiting workspace. The frontend is hosted on Vercel.

## Features

- PocketBase authentication and organization-scoped collections
- Transactional organization onboarding
- One-time, expiring organization invitation codes
- Fly.io deployment with persistent PocketBase data

## Custom routes

All routes require a `users` auth token.

| Method | Route | Access |
| --- | --- | --- |
| `POST` | `/api/nexhire/organizations` | Organization-less user |
| `GET` | `/api/nexhire/invites` | Owner or admin |
| `POST` | `/api/nexhire/invites` | Owner or admin |
| `DELETE` | `/api/nexhire/invites/{id}` | Owner or admin |
| `POST` | `/api/nexhire/invites/redeem` | Organization-less user |

Invite creation returns the raw token once. Only its SHA-256 hash is stored.

## Deployment

The Docker image copies `pb_hooks` into `/pb/pb_hooks`. Pushes to `main` deploy through the Fly.io workflow. PocketBase data remains on the `pb_data` volume.
