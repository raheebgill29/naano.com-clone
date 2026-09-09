# DATA_MODEL.md — Naano (Supabase / Postgres)

Lean schema for the 24-hour rebuild. Nine application tables plus `auth.users`. No chat, invoices, orgs, or LinkedIn sync tables.

Money fields use integer **cents**. Timestamps are `timestamptz`. UUIDs are `gen_random_uuid()` unless noted.

---

## ER overview

```
auth.users 1──1 profiles
                │
        ┌───────┴────────┐
        │                │
     brands 1──* campaigns
        │                │
        │                └──* campaign_creators *──1 creators 1──1 profiles
        │                          │
        └──* saved_creators *──────┘
                               │
                               ├──* content_submissions
                               ├──? campaign_metrics   (0..1 per booking)
                               └──? payouts            (0..1 per booking)
```

`campaign_creators` is the collaboration spine: status lifecycle, price snapshot, and parent of submissions / metrics / payouts.

---

## 1. `profiles`

Extends Supabase Auth. One row per user; holds role and display identity.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | **PK**, FK → `auth.users(id)` ON DELETE CASCADE |
| `role` | `text` | NO | `brand` \| `creator` |
| `full_name` | `text` | NO | |
| `avatar_url` | `text` | YES | Optional; no real LinkedIn sync |
| `created_at` | `timestamptz` | NO | default `now()` |
| `updated_at` | `timestamptz` | NO | default `now()` |

**Constraints**

- `profiles_role_check`: `role in ('brand','creator')`
- PK: `id`

**Indexes**

- PK on `id` is enough for P0

**Ownership**

- Row owner: `id = auth.uid()`
- Created on signup (trigger or app insert after auth)

**RLS intent**

- `SELECT`: own row; brands may need to read creator profile display fields via joins — prefer exposing public creator fields through `creators` policies, not wide `profiles` reads. Minimal approach: authenticated users can `SELECT` profiles that are linked to listed creators (or allow `SELECT` of `full_name`/`avatar_url` for any authenticated user).
- `INSERT`: own `id` only, at signup.
- `UPDATE`: own row only.
- `DELETE`: deny (or cascade via auth admin only).

---

## 2. `brands`

Company profile for brand users.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | **PK** |
| `profile_id` | `uuid` | NO | **FK** → `profiles(id)` ON DELETE CASCADE; **UNIQUE** |
| `company_name` | `text` | NO | |
| `website` | `text` | YES | |
| `industry` | `text` | YES | |
| `logo_url` | `text` | YES | |
| `description` | `text` | YES | |
| `created_at` | `timestamptz` | NO | default `now()` |
| `updated_at` | `timestamptz` | NO | default `now()` |

**Constraints**

- `brands_profile_id_key` UNIQUE (`profile_id`) — one brand per user
- FK `profile_id` → `profiles`

**Indexes**

- UNIQUE on `profile_id`
- Optional: `company_name` for admin search (skip for P0)

**Ownership**

- Owner profile: `profile_id = auth.uid()`

**RLS intent**

- `SELECT`: owner; booked creators can read the brand row for campaigns they joined (via `campaign_creators` existence).
- `INSERT` / `UPDATE`: owner only, and `profiles.role = 'brand'`.
- `DELETE`: owner only (rare).

---

## 3. `creators`

Public marketplace profile for creator users.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | **PK** |
| `profile_id` | `uuid` | NO | **FK** → `profiles(id)` ON DELETE CASCADE; **UNIQUE** |
| `headline` | `text` | NO | LinkedIn-style positioning |
| `bio` | `text` | YES | |
| `topics` | `text[]` | NO | default `'{}'` — filter facet |
| `audience_size` | `integer` | NO | Followers / reach estimate (manual) |
| `audience_summary` | `text` | YES | e.g. “B2B SaaS marketers, US/EU” |
| `price_cents` | `integer` | NO | Fixed per-post price |
| `currency` | `text` | NO | default `'USD'` |
| `linkedin_url` | `text` | YES | Manual URL only |
| `is_discoverable` | `boolean` | NO | default `true` |
| `created_at` | `timestamptz` | NO | default `now()` |
| `updated_at` | `timestamptz` | NO | default `now()` |

**Constraints**

- UNIQUE `profile_id`
- `creators_price_check`: `price_cents >= 0`
- `creators_audience_check`: `audience_size >= 0`

**Indexes**

- UNIQUE `profile_id`
- GIN on `topics` for `topics && ARRAY[...]`
- btree on `price_cents`, `audience_size` for range filters
- partial index `(id) where is_discoverable = true` optional

**Ownership**

- Owner: `profile_id = auth.uid()`

**RLS intent**

- `SELECT`: any authenticated **brand** may read rows with `is_discoverable = true`; creator may read own row always.
- `INSERT` / `UPDATE`: owner only, `profiles.role = 'creator'`.
- `DELETE`: owner only.

---

## 4. `campaigns`

Brand-owned brief / campaign container.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | **PK** |
| `brand_id` | `uuid` | NO | **FK** → `brands(id)` ON DELETE CASCADE |
| `title` | `text` | NO | |
| `objective` | `text` | YES | |
| `brief_body` | `text` | NO | Main brief creators see |
| `deliverables` | `text` | YES | e.g. “1 LinkedIn feed post” |
| `timeline_notes` | `text` | YES | |
| `budget_notes` | `text` | YES | Soft budget; not a payment amount |
| `status` | `text` | NO | `draft` \| `active` \| `archived`; default `active` for P0 creates |
| `created_at` | `timestamptz` | NO | default `now()` |
| `updated_at` | `timestamptz` | NO | default `now()` |

**Constraints**

- `campaigns_status_check`: `status in ('draft','active','archived')`
- FK `brand_id`

**Indexes**

- btree `(brand_id, created_at desc)`

**Ownership**

- Owning brand via `brand_id` → `brands.profile_id = auth.uid()`

**RLS intent**

- `SELECT`: owning brand; creators with a `campaign_creators` row for this `campaign_id`.
- `INSERT` / `UPDATE` / `DELETE`: owning brand only.

---

## 5. `campaign_creators`

Booking + collaboration state for one creator on one campaign.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | **PK** |
| `campaign_id` | `uuid` | NO | **FK** → `campaigns(id)` ON DELETE CASCADE |
| `creator_id` | `uuid` | NO | **FK** → `creators(id)` ON DELETE RESTRICT |
| `status` | `text` | NO | Lifecycle enum — see below |
| `price_cents` | `integer` | NO | Snapshot of creator price at booking |
| `currency` | `text` | NO | default `'USD'` |
| `decline_reason` | `text` | YES | |
| `published_url` | `text` | YES | Final LinkedIn post URL (also mirrored on latest publish submission) |
| `booked_at` | `timestamptz` | YES | When moved to `booking_pending` |
| `accepted_at` | `timestamptz` | YES | |
| `completed_at` | `timestamptz` | YES | |
| `created_at` | `timestamptz` | NO | default `now()` |
| `updated_at` | `timestamptz` | NO | default `now()` |

**Status values**

```
draft
booking_pending
accepted
content_in_progress
draft_submitted
revision_requested
approved
scheduled
published
completed
payout_released
declined
expired
cancelled
```

**Constraints**

- UNIQUE `(campaign_id, creator_id)`
- `campaign_creators_status_check` — status ∈ set above
- `campaign_creators_price_check`: `price_cents >= 0`
- FKs as above

**Indexes**

- UNIQUE `(campaign_id, creator_id)`
- btree `(creator_id, status)` — creator opportunities inbox
- btree `(campaign_id, status)` — brand workspace
- btree `(status, booked_at)` — optional expiry scans

**Ownership**

- Brand side: via campaign → brand → profile
- Creator side: via `creator_id` → `creators.profile_id = auth.uid()`

**RLS intent**

- `SELECT`: owning brand **or** assigned creator.
- `INSERT`: owning brand only (creates booking).
- `UPDATE`:
  - Brand: cancel/expire; approve / revision_requested; scheduled; completed; payout_released; may set status per PRODUCT_SCOPE §7.
  - Creator: accept/decline; content_in_progress; draft_submitted; set `published_url` / published transition.
- Enforce allowed transitions in **application code** (RLS is not a full state machine).
- `DELETE`: brand only, and only while `status in ('draft','booking_pending','cancelled')` if enforced in app.

---

## 6. `saved_creators`

Brand shortlist.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | **PK** |
| `brand_id` | `uuid` | NO | **FK** → `brands(id)` ON DELETE CASCADE |
| `creator_id` | `uuid` | NO | **FK** → `creators(id)` ON DELETE CASCADE |
| `created_at` | `timestamptz` | NO | default `now()` |

**Constraints**

- UNIQUE `(brand_id, creator_id)`

**Indexes**

- UNIQUE `(brand_id, creator_id)`
- btree `(brand_id, created_at desc)`

**Ownership**

- Brand owner only

**RLS intent**

- All CRUD: owning brand only.
- Creators cannot see who saved them (P0).

---

## 7. `content_submissions`

Draft (and optional publish) artifacts for a collaboration. Supports revision history.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | **PK** |
| `campaign_creator_id` | `uuid` | NO | **FK** → `campaign_creators(id)` ON DELETE CASCADE |
| `submission_type` | `text` | NO | `draft` \| `publish` |
| `version` | `integer` | NO | Monotonic per `(campaign_creator_id, submission_type)` |
| `body` | `text` | YES | Draft copy / caption; required for `draft` in app |
| `published_url` | `text` | YES | Required for `publish` in app |
| `notes` | `text` | YES | Creator note to brand |
| `submitted_by` | `uuid` | NO | **FK** → `profiles(id)` — creator user |
| `created_at` | `timestamptz` | NO | default `now()` |

**Constraints**

- `content_submissions_type_check`: `submission_type in ('draft','publish')`
- `content_submissions_version_check`: `version >= 1`
- UNIQUE `(campaign_creator_id, submission_type, version)`

**Indexes**

- btree `(campaign_creator_id, submission_type, version desc)`

**Ownership**

- Writer: assigned creator (`submitted_by = auth.uid()` and matches campaign_creator’s creator).
- Reader: brand owner + assigned creator.

**RLS intent**

- `SELECT`: brand or creator on parent `campaign_creators`.
- `INSERT`: assigned creator only.
- `UPDATE` / `DELETE`: deny for P0 (immutable history); brand feedback is status on `campaign_creators`, not edits to old rows.

Brand “request revision” does not write here; creator’s next `INSERT` bumps `version`.

---

## 8. `campaign_metrics`

Seeded / demo performance for a published collaboration. **No live ingestion.**

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | **PK** |
| `campaign_creator_id` | `uuid` | NO | **FK** → `campaign_creators(id)` ON DELETE CASCADE; **UNIQUE** |
| `impressions` | `integer` | NO | default `0` |
| `likes` | `integer` | NO | default `0` |
| `comments` | `integer` | NO | default `0` |
| `shares` | `integer` | NO | default `0` |
| `clicks` | `integer` | NO | default `0` |
| `engagement_rate` | `numeric(6,4)` | YES | Optional denormalized demo field |
| `captured_at` | `timestamptz` | NO | default `now()` — fake “as of” |
| `created_at` | `timestamptz` | NO | default `now()` |
| `updated_at` | `timestamptz` | NO | default `now()` |

**Constraints**

- UNIQUE `campaign_creator_id` — one metrics snapshot per booking for P0
- Non-negative checks on count columns

**Indexes**

- UNIQUE `campaign_creator_id`

**Ownership**

- Readable by brand + creator on parent booking.
- Writable only via service role / seed (no authenticated UI writes).

**RLS intent**

- `SELECT`: brand or creator on parent.
- `INSERT` / `UPDATE` / `DELETE`: deny for `authenticated` role; seed uses service role.

---

## 9. `payouts`

Demo payout / payment status. **No payment provider.**

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `uuid` | NO | **PK** |
| `campaign_creator_id` | `uuid` | NO | **FK** → `campaign_creators(id)` ON DELETE CASCADE; **UNIQUE** |
| `amount_cents` | `integer` | NO | Usually equals booking `price_cents` |
| `currency` | `text` | NO | default `'USD'` |
| `status` | `text` | NO | `not_started` \| `pending` \| `released` \| `failed` (demo) |
| `released_at` | `timestamptz` | YES | |
| `created_at` | `timestamptz` | NO | default `now()` |
| `updated_at` | `timestamptz` | NO | default `now()` |

**Constraints**

- UNIQUE `campaign_creator_id`
- `payouts_status_check`: status ∈ set above
- `payouts_amount_check`: `amount_cents >= 0`

**Indexes**

- UNIQUE `campaign_creator_id`
- btree `(status)` optional

**Ownership**

- Same visibility as parent booking.
- Status changes: service role / seed, **or** brand demo action that sets `released` when moving collaboration to `payout_released` (single controlled path in app using a privileged server action). Prefer one server action that updates both `campaign_creators.status` and `payouts.status` together.

**RLS intent**

- `SELECT`: brand or creator on parent.
- Direct client `UPDATE`: deny; use server action + service role or carefully scoped brand update policy for demo release only.

---

## 10. Auth & helper conventions

| Item | Choice |
|------|--------|
| Auth | Supabase Email/Password (or magic link) — enough for assignment |
| Role source of truth | `profiles.role` |
| Brand ↔ user | `brands.profile_id` |
| Creator ↔ user | `creators.profile_id` |
| Collaboration PK used in routes | `campaign_creators.id` |
| Enums | `text` + CHECK for speed; Postgres enums optional |

**Suggested signup flow**

1. `auth.signUp`
2. Insert `profiles` (`id`, `role`, `full_name`)
3. Redirect to `/brand/onboarding` or `/creator/onboarding` to insert `brands` / `creators`

---

## 11. Seed expectations (demo substitutes)

Minimum seed:

- ≥1 brand user + brand row
- ≥3 discoverable creators with varied `topics`, `audience_size`, `price_cents`
- Optional: one `campaign` + `campaign_creators` mid-funnel for screenshots
- For a fully published demo row: `content_submissions`, `campaign_metrics`, `payouts`

No tables for email outbox, LinkedIn tokens, invoices, or chat.

---

## 12. What we intentionally did not add

| Omitted | Why |
|---------|-----|
| `organizations` / `memberships` | Single-player brand accounts |
| `messages` | Chat excluded |
| `invoices` / `payment_intents` | Payments excluded |
| `linkedin_accounts` | LinkedIn integration excluded |
| `notifications` | In-app lists suffice |
| `audit_log` | Overkill for 24h |
| Multiple metrics time series | One snapshot row is enough |

---

## 13. Model ↔ product checklist

| Product need | Table / field |
|--------------|----------------|
| Company profile | `brands` |
| Creator positioning, audience, topics, price | `creators` |
| Browse / filter | `creators` + indexes |
| Save creators | `saved_creators` |
| Campaign brief | `campaigns.brief_body` (+ related fields) |
| Book creators | `campaign_creators` |
| Collaboration statuses | `campaign_creators.status` |
| Draft review | `content_submissions` + status transitions |
| Published URL | `campaign_creators.published_url` + `content_submissions` type `publish` |
| Metrics | `campaign_metrics` |
| Payment / payout status | `payouts.status` (+ `payout_released` on collaboration) |
