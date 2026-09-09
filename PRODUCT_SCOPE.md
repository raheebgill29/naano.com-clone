# PRODUCT_SCOPE.md — Naano (24-hour rebuild)

Time-boxed B2B LinkedIn creator marketplace. Two authenticated roles: **Brand** and **Creator**. Auth is Supabase Auth; data is Postgres via Supabase with RLS. Excluded real-world systems are represented by statuses and seeded demo data only.

---

## 1. Roles

| Role | Purpose |
|------|---------|
| **Brand** | Discover creators, shortlist, create campaign briefs, book creators, run collaboration through draft review → publication → demo analytics/payout visibility |
| **Creator** | Maintain a priced LinkedIn creator profile; for P0, act on a booked opportunity through accept → draft → published URL → payout status |

A user has exactly one role (`brand` or `creator`) on `profiles.role`. Switching roles is out of scope.

---

## 2. P0 functionality

### 2.1 Brand P0 journey (must ship)

Ordered path:

1. **Authentication** — sign up / sign in as brand; create or complete company profile if missing.
2. **Creator discovery** — browse creators with basic filters (topics, audience size band, price range).
3. **Creator details** — view profile, positioning, topics, audience summary, **fixed per-post price**.
4. **Shortlist** — save / unsave creators (`saved_creators`).
5. **Campaign creation** — create a campaign brief (objective, message, deliverables, timeline, budget notes).
6. **Creator booking** — select one or more creators (from shortlist or detail) and send booking requests → `booking_pending`.
7. **Campaign workspace** — list booked creators and their collaboration statuses; open a per-creator collaboration view.
8. **Draft review** — when a draft is submitted, approve or request revisions.
9. **Publication** — after approval path reaches `published`, view the submitted published-post URL.
10. **Analytics** — view seeded performance metrics and payment/payout status for that collaboration.

### 2.2 Creator P0 scope (must ship — intentionally narrow)

1. **View opportunity** — see pending booking tied to a campaign brief.
2. **Accept** (or decline) — `booking_pending` → `accepted` or `declined`.
3. **Submit draft** — move into content work and upload/submit post draft text (and optional notes).
4. **Submit published URL** — after brand approval path, submit LinkedIn post URL.
5. **View payout status** — read-only demo payout state for that collaboration.

Creator P0 does **not** require full profile onboarding polish beyond fields needed for discovery seeds and opportunity context, but a usable creator profile (positioning, audience, topics, price) must exist for discovery demos.

### 2.3 Shared P0

- Role-gated routes and RLS-backed reads/writes.
- Collaboration status visible to both parties for their bookings.
- Seeded demo creators, at least one demo campaign path that can be walked end-to-end (or nearly), with metrics/payouts pre-seeded where real ingestion/payments are excluded.

---

## 3. Secondary functionality (nice-to-have if time)

Ship only if P0 is solid:

- Brand: edit company profile after first save.
- Brand: richer discovery filters (location, language) if columns already exist.
- Brand: cancel a booking before creator accepts (`cancelled`).
- Brand: mark/view `expired` bookings (time-based or manual demo action).
- Creator: decline with optional reason text.
- Creator: respond to revision requests with a new draft version (required for a complete revision loop if brands can request revisions in P0 — see §8).
- Campaign list for brand (all campaigns, not only the one in progress).
- Empty states and basic validation messages.

Secondary does **not** expand into excluded systems (chat, real LinkedIn, real pay, etc.).

---

## 4. Explicitly excluded functionality

Do **not** build. Represent with statuses + seed data where the UI would otherwise hang:

| Excluded | Demo substitute |
|----------|-----------------|
| Real LinkedIn OAuth / posting / profile sync | Manual profile fields; published URL as plain string; no API calls |
| Real payments / Stripe / escrow | `payouts.status` enum; seeded rows; brand “payment status” reads from payouts |
| Automatic invoices | No invoice entities; omit from UI or show static “Invoice: demo” label |
| Real email delivery | No email provider; in-app lists only (“opportunities”, statuses) |
| Real attribution / analytics ingestion | `campaign_metrics` seeded numbers; editable only via seed/SQL, not live pull |
| Real-time chat | No messages table; communication implied by status + draft notes |
| Organization invitations / multi-seat teams | One user ↔ one brand or one creator |
| Admin tooling | No admin role, no moderation console |

---

## 5. Route map

App Router style paths. Middleware enforces auth + role.

### Public

| Route | Purpose |
|-------|---------|
| `/` | Marketing/landing or redirect to login |
| `/login` | Sign in |
| `/signup` | Sign up; choose role brand \| creator |

### Brand (`role = brand`)

| Route | Purpose |
|-------|---------|
| `/brand/onboarding` | Company profile create/complete |
| `/brand/discover` | Creator browse + filters |
| `/brand/creators/[creatorId]` | Creator detail + save + book CTA |
| `/brand/shortlist` | Saved creators |
| `/brand/campaigns` | Campaign list |
| `/brand/campaigns/new` | Create brief |
| `/brand/campaigns/[campaignId]` | Campaign workspace (roster + statuses) |
| `/brand/campaigns/[campaignId]/creators/[campaignCreatorId]` | Collaboration: brief context, draft review, metrics, payout |

### Creator (`role = creator`)

| Route | Purpose |
|-------|---------|
| `/creator/onboarding` | Creator profile create/complete |
| `/creator/opportunities` | Incoming / active bookings |
| `/creator/opportunities/[campaignCreatorId]` | Opportunity detail: brief, accept/decline, draft, published URL, payout |

### Out of P0 routes (do not add unless secondary time)

- Messaging, settings beyond profile, org/team, admin, billing portals, LinkedIn connect.

---

## 6. Role permissions

| Action | Brand | Creator |
|--------|-------|---------|
| CRUD own `brands` row | Yes | No |
| CRUD own `creators` row | No | Yes |
| Read discoverable creators | Yes | No (self only) |
| Save / unsave creators | Yes (own brand) | No |
| CRUD own campaigns | Yes | No |
| Read campaign brief for own booking | Yes (owner) | Yes (booked creator) |
| Create `campaign_creators` (book) | Yes | No |
| Accept / decline booking | No | Yes (assignee) |
| Cancel booking (pre-accept) | Yes | No |
| Submit / revise draft | No | Yes |
| Approve draft / request revision | Yes | No |
| Submit published URL | No | Yes |
| Transition to `scheduled` / `published` / `completed` | Brand-driven or system rules in app (§7) | Limited — URL submit triggers publish path |
| Read metrics for own collaborations | Yes | Yes (own row) |
| Read payouts for own collaborations | Yes | Yes (own row) |
| Mutate metrics / payouts in app UI | No (seed/SQL only) | No |

---

## 7. Campaign-state transition rules

Canonical lifecycle lives on **`campaign_creators.status`** (per creator booking), not on the campaign header.

### Happy path

```
draft
  → booking_pending      (brand sends booking)
  → accepted             (creator accepts)
  → content_in_progress  (creator starts work / opens submit flow)
  → draft_submitted      (creator submits draft)
  → approved             (brand approves)  OR  revision_requested (brand)
  → scheduled            (brand confirms schedule after approval — demo action)
  → published            (creator submits published URL, or brand confirms)
  → completed            (brand or automatic when metrics seeded / demo complete)
  → payout_released      (demo: mark payout released / seed reflects it)
```

### Terminal / side paths

| Status | Who | From | Meaning |
|--------|-----|------|---------|
| `declined` | Creator | `booking_pending` | Creator refuses |
| `expired` | Brand or demo job | `booking_pending` (or `draft`) | Offer lapsed |
| `cancelled` | Brand | `draft`, `booking_pending` (optionally early `accepted` if time) | Brand withdraws |

### Revision loop

```
draft_submitted → revision_requested → draft_submitted → … → approved
```

Each creator submit creates or versions a `content_submissions` row (`submission_type = draft`).

### Guardrails

- No skipping forward except where product allows a single demo “fast-forward” control (optional secondary; default: enforce transitions in app).
- `payout_released` only after `completed` (or simultaneously in seed for finished demos).
- Campaign row may use a light `campaigns.status`: `draft` \| `active` \| `archived` — independent of per-creator lifecycle; **P0 can keep campaigns `active` once created** to avoid dual state machines.

### Mapping to brand/creator UI actions

| UI action | Status effect |
|-----------|---------------|
| Brand creates booking rows | `draft` or directly `booking_pending` |
| Brand sends request | → `booking_pending` |
| Creator accepts | → `accepted` |
| Creator declines | → `declined` |
| Creator begins draft / first save | → `content_in_progress` |
| Creator submits draft | → `draft_submitted` |
| Brand requests changes | → `revision_requested` |
| Brand approves | → `approved` |
| Brand marks scheduled | → `scheduled` |
| Creator submits post URL | → `published` (from `approved` or `scheduled`) |
| Brand marks complete | → `completed` |
| Demo payout | → `payout_released` + `payouts.status = released` |

---

## 8. Acceptance criteria — main journey

A reviewer can complete the following without code changes or SQL mid-demo (seed may pre-create users):

### Brand path

1. Sign in as a brand user (or sign up + complete company profile).
2. Open Discover; see ≥3 seeded creators with price and topics.
3. Open a creator detail; see fixed per-post price.
4. Save creator; see them on Shortlist.
5. Create a campaign with a non-empty brief.
6. Book at least one creator onto that campaign; status `booking_pending`.
7. After creator accepts (second browser/user or seeded accept), workspace shows `accepted` / later states.
8. When draft is submitted, brand can **approve** or **request revision**.
9. After publish path, brand sees published URL, seeded metrics, and payment/payout status.

### Creator path (P0)

1. Sign in as creator; open Opportunities; see the booking + brief.
2. Accept opportunity.
3. Submit a draft (text).
4. After brand approval (and schedule if required), submit a published-post URL.
5. View payout status (e.g. `pending` / `released`) without any real payout execution.

### Quality bar for 24h

- Happy path works for one brand + one creator pair.
- RLS prevents cross-tenant reads/writes on campaigns, submissions, payouts.
- No dead-end screens on the P0 routes above.
- Excluded systems never pretend to call external APIs.

---

## 9. Architecture constraints (24-hour)

- Next.js App Router + Supabase (Auth, Postgres, RLS).
- Single Supabase project; no extra queues, workers, or microservices.
- No message bus; status fields are the workflow engine.
- Seed script or SQL file for demo data (creators, optional in-flight collaborations, metrics, payouts).
- Prefer server actions / route handlers talking to Supabase; avoid unnecessary repositories or domain layers.

---

## 10. Scope risks & inconsistencies (read before build)

See closing notes after `DATA_MODEL.md` is written; summary:

1. **Lifecycle `draft` vs campaign draft** — naming collision; `campaign_creators.status = draft` means “booking row not sent yet,” not campaign brief draft.
2. **Creator P0 vs brand revision** — if brands can request revisions in P0, creators must be able to resubmit drafts (minimal revision loop) or brand revision is secondary-only.
3. **Who owns `scheduled` / `published` / `completed`** — needs one clear rule set (documented in §7); avoid both roles fighting the same transition.
4. **Brand “manage collaboration statuses”** vs creator-limited P0 — brand UI may show the full state machine while creator UI only exposes accept / draft / URL / payout.
5. **Payments vs `payout_released`** — brand “payment status” should read `payouts`, not a second invented ledger.
6. **Auth for both roles is required** for the acceptance demo even though the narrative journey leads with brand auth.
7. **Price snapshot** — booking should freeze `price_cents` on `campaign_creators` so later profile price edits do not rewrite history.
8. **Over-ambition watch** — multi-creator campaign workspace, full filter UX, and polished dual onboarding can blow the time box; cut filters and onboarding copy before cutting the state machine.

**Decision for this assignment (P0):** creators **can** resubmit after `revision_requested` (one extra draft submit). Brand actions for `scheduled`, `completed`, and demo `payout_released` are simple buttons on the collaboration page. Metrics remain seed-only.

---

## 11. Pre-build findings (inconsistencies / gaps / ambition)

Resolved in these docs where possible; flag before implementation:

| # | Issue | Severity | Resolution in this scope |
|---|--------|----------|---------------------------|
| 1 | Lifecycle status `draft` vs `campaigns.status = draft` | Naming | Different tables; booking `draft` = unsent booking row |
| 2 | Brand P0 includes revision; creator P0 list omitted resubmit | Gap | P0 adds creator resubmit after `revision_requested` |
| 3 | Ambiguous owner of `scheduled` → `published` → `completed` | Gap | Brand: schedule/complete/payout; Creator: publish URL |
| 4 | “Payment status” vs `payouts` vs `payout_released` | Duplication risk | Single demo: `payouts.status` + collaboration status updated together |
| 5 | Journey text leads with brand auth only | Missing | Creator auth required for acceptance criteria |
| 6 | Live price vs booked price | Missing relationship | `campaign_creators.price_cents` snapshot at book time |
| 7 | Full multi-creator workspace + rich filters + dual onboarding | Over-ambition | Cut filter facets before cutting state machine; one happy-path pair is enough |
| 8 | `content_submissions.published_url` and `campaign_creators.published_url` | Mild duplication | Keep both: submission is history; column on booking is denormalized “current” for UI |
| 9 | No FK from metrics/payouts until publish | OK | Create rows lazily on publish/complete or seed ahead |
| 10 | Profiles visibility for brands reading creator names | RLS detail | Prefer join via `creators`; avoid open `profiles` table |

No extra tables recommended. Do not expand P0 into org invites, chat, or payment providers.
