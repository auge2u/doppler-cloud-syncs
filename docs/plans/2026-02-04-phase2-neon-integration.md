# Phase 2: Neon Integration Implementation Plan

**Goal:** Add full Neon database integration with provisioning, branch management, and migration coordination.

**Architecture:** Neon adapter uses the Neon API for project/branch management. Branch-to-environment mapping syncs connection strings to Doppler automatically.

**Tech Stack:** Neon API, node-postgres for migrations

---

## Tasks

1. Add Neon platform adapter
2. Implement `dcs provision neon` command
3. Implement `dcs neon branch` commands
4. Implement `dcs neon migrate` command
5. Update config schema for Neon
6. Add tests and documentation
