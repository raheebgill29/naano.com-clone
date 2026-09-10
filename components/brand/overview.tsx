import Link from "next/link";

import { PrimaryLink, SecondaryLink } from "@/components/ui/primitives";
import {
  Portrait,
  SectionTitle,
  formatCompactCount,
  formatPriceCents,
} from "@/components/workspace/ui";
import type {
  ActiveCampaignCard,
  ActivityItem,
  AttentionItem,
  BrandDashboardData,
  NextBestAction,
  ProfileCompletion,
  RecommendedCreator,
} from "@/lib/brand/dashboard-data";
import { campaignStatusBadgeClass } from "@/lib/campaigns/status";
import type { CampaignStatus } from "@/lib/supabase/database.types";

function relativeTime(iso: string, nowMs: number) {
  const diffSec = Math.round((new Date(iso).getTime() - nowMs) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 48) return rtf.format(hr, "hour");
  const day = Math.round(hr / 24);
  if (Math.abs(day) < 30) return rtf.format(day, "day");
  return rtf.format(Math.round(day / 30), "month");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function BrandOverview({ data }: { data: BrandDashboardData }) {
  const {
    profile,
    metrics,
    attention,
    activeCampaigns,
    profileCompletion,
    nextActions,
    recentActivity,
    recommendedCreators,
  } = data;
  const firstName = profile.full_name.split(/\s+/)[0] || profile.full_name;
  const company = data.brand?.company_name ?? "";
  const nowMs = data.loadedAtMs;
  const [lead, ...otherCampaigns] = activeCampaigns;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-ink-subtle">
            {todayLabel()}
            {company ? ` · ${company}` : ""}
          </p>
          <h1 className="display mt-1 text-[2rem] text-ink sm:text-[2.5rem]">
            Good to see you, {firstName}.
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryLink href="/brand/campaigns/new" className="!w-auto">
            New campaign
          </PrimaryLink>
          <SecondaryLink href="/brand/discover" className="!w-auto">
            Browse creators
          </SecondaryLink>
        </div>
      </header>

      <MetricStrip metrics={metrics} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-8 lg:col-span-8">
          {lead ? (
            <LeadCampaign campaign={lead} />
          ) : (
            <EmptyLead hasProfile={Boolean(profileCompletion)} />
          )}
          {otherCampaigns.length ? (
            <OtherCampaigns campaigns={otherCampaigns} />
          ) : null}
          <ActivityFeed items={recentActivity} nowMs={nowMs} />
        </div>

        <aside className="min-w-0 space-y-8 lg:col-span-4">
          <ActionQueue items={attention} />
          <NextActions actions={nextActions} />
          {profileCompletion && profileCompletion.percent < 100 ? (
            <ProfileNudge profile={profileCompletion} />
          ) : null}
        </aside>
      </div>

      {recommendedCreators.length ? (
        <Recommendations creators={recommendedCreators} />
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Metric strip — one horizontal band, no cards
 * ------------------------------------------------------------------------- */
function MetricStrip({
  metrics,
}: {
  metrics: BrandDashboardData["metrics"];
}) {
  const items: Array<{ label: string; value: number; href: string }> = [
    { label: "Active campaigns", value: metrics.activeCampaigns, href: "/brand/campaigns?status=active" },
    { label: "In progress", value: metrics.activeCollaborations, href: "/brand/collaborations" },
    { label: "Awaiting review", value: metrics.draftsAwaitingReview, href: "/brand/collaborations?filter=needs_review" },
    { label: "Pending invites", value: metrics.pendingInvites, href: "/brand/campaigns" },
    { label: "Completed", value: metrics.completedCollaborations, href: "/brand/collaborations?filter=completed" },
    { label: "Unread", value: metrics.unreadMessages, href: "/brand/messages" },
  ];
  return (
    <dl className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-[12px] border border-line bg-surface sm:grid-cols-6">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-page/60"
        >
          <dt className="text-[11px] font-medium text-ink-subtle group-hover:text-ink-muted">
            {item.label}
          </dt>
          <dd className="display tnum text-[1.75rem] text-ink">{item.value}</dd>
        </Link>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------------------------
 * Lead campaign — the wide module
 * ------------------------------------------------------------------------- */
function RosterStack({
  roster,
  size = "h-9 w-9",
  max = 5,
}: {
  roster: ActiveCampaignCard["roster"];
  size?: string;
  max?: number;
}) {
  if (roster.length === 0) {
    return <span className="text-[12px] text-ink-subtle">No creators yet</span>;
  }
  const shown = roster.slice(0, max);
  const extra = roster.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((c, i) => (
        <span
          key={c.id}
          className={`${i === 0 ? "" : "-ml-2.5"} rounded-full ring-2 ring-surface`}
          title={c.name}
        >
          <Portrait
            src={c.avatarUrl}
            name={c.name}
            className={size}
            rounded="rounded-full"
            textClass="text-[11px]"
          />
        </span>
      ))}
      {extra > 0 ? (
        <span className="-ml-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-page text-[11px] font-semibold text-ink-muted ring-2 ring-surface">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

function LeadCampaign({ campaign }: { campaign: ActiveCampaignCard }) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-line bg-surface">
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
              Active campaign
            </span>
            <span
              className={`inline-flex rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(
                campaign.status as CampaignStatus,
              )}`}
            >
              {campaign.statusLabel}
            </span>
          </div>
          <Link
            href={`/brand/campaigns/${campaign.id}`}
            className="display mt-2 block text-[1.75rem] leading-[1.1] text-ink hover:text-accent sm:text-[2.125rem]"
          >
            {campaign.name}
          </Link>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-[11px] font-medium text-ink-subtle">Creators</p>
              <div className="mt-1.5">
                <RosterStack roster={campaign.roster} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-ink-subtle">Budget</p>
              <p className="tnum mt-1 text-[15px] font-semibold text-ink">
                {formatPriceCents(campaign.budgetCents, campaign.currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-ink-subtle">Target date</p>
              <p className="tnum mt-1 text-[15px] font-semibold text-ink">
                {formatDate(campaign.targetPublishDate)}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-support">{campaign.progressLabel}</span>
              <span className="tnum font-semibold text-ink">
                {campaign.progressPercent}%
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-page"
              role="progressbar"
              aria-valuenow={campaign.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Campaign completion"
            >
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${campaign.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-4 border-t border-line pt-5 lg:w-60 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-[11px] font-medium text-ink-subtle">Next milestone</p>
            <p className="mt-1 text-[15px] font-semibold text-ink">
              {campaign.nextMilestone}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-support">
              {campaign.pendingInvites} pending · {campaign.activeCollaborations}{" "}
              active · {campaign.completedCollaborations} done
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <PrimaryLink href={campaign.nextAction.href} className="!w-full">
              {campaign.nextAction.label}
            </PrimaryLink>
            <Link
              href={`/brand/campaigns/${campaign.id}`}
              className="text-center text-[13px] font-semibold text-ink-muted hover:text-ink"
            >
              Open campaign
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyLead({ hasProfile }: { hasProfile: boolean }) {
  return (
    <section className="rounded-[12px] border border-dashed border-line-strong bg-surface p-6 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
        Campaign command center
      </p>
      <h2 className="display mt-2 text-[1.75rem] text-ink">
        No active campaign yet.
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-support">
        {hasProfile
          ? "Write a brief, then invite creators from the marketplace. Progress and approvals will appear here."
          : "Finish your company profile, then write your first brief."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryLink href="/brand/campaigns/new" className="!w-auto">
          Create campaign
        </PrimaryLink>
        <SecondaryLink href="/brand/discover" className="!w-auto">
          Browse creators
        </SecondaryLink>
      </div>
    </section>
  );
}

function OtherCampaigns({ campaigns }: { campaigns: ActiveCampaignCard[] }) {
  return (
    <section>
      <SectionTitle
        title="Also running"
        count={campaigns.length}
        action={
          <Link
            href="/brand/campaigns"
            className="text-[12px] font-semibold text-ink-muted hover:text-ink"
          >
            All campaigns
          </Link>
        }
      />
      <ul className="mt-3 divide-y divide-line">
        {campaigns.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
          >
            <Link
              href={`/brand/campaigns/${c.id}`}
              className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink hover:text-accent"
            >
              {c.name}
            </Link>
            <RosterStack roster={c.roster} size="h-7 w-7" max={4} />
            <span className="tnum w-24 text-right text-[13px] text-ink-muted">
              {formatPriceCents(c.budgetCents, c.currency)}
            </span>
            <span className="w-32 text-[12px] text-support">{c.nextMilestone}</span>
            <span
              className={`inline-flex rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(
                c.status as CampaignStatus,
              )}`}
            >
              {c.statusLabel}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Action queue — narrow list of decisions
 * ------------------------------------------------------------------------- */
function ActionQueue({ items }: { items: AttentionItem[] }) {
  return (
    <section>
      <SectionTitle title="Action queue" count={items.length} />
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-support">
          Nothing waiting on you.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((item) => {
            const urgent = item.statusTone === "urgent";
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-start gap-3 py-3 transition-colors"
                >
                  <span
                    aria-hidden
                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                      urgent ? "bg-accent" : "bg-line-strong"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold leading-5 text-ink group-hover:text-accent">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-support">
                      {item.context}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-[12px] font-semibold text-ink-muted group-hover:text-accent">
                    {item.actionLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function NextActions({ actions }: { actions: NextBestAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section>
      <SectionTitle title="Suggested" />
      <ul className="mt-2 divide-y divide-line">
        {actions.map((action) => (
          <li key={action.id} className="py-3">
            <p className="text-[14px] font-semibold text-ink">{action.title}</p>
            <p className="mt-0.5 text-[12px] leading-5 text-support">
              {action.description}
            </p>
            <Link
              href={action.href}
              className="mt-1.5 inline-block text-[12px] font-semibold text-accent hover:text-accent-hover"
            >
              {action.actionLabel} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProfileNudge({ profile }: { profile: ProfileCompletion }) {
  return (
    <section className="rounded-[10px] border border-line bg-page/60 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-ink">Company profile</p>
        <span className="tnum text-[12px] font-semibold text-ink-muted">
          {profile.percent}%
        </span>
      </div>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={profile.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Company profile completion"
      >
        <div
          className="h-full rounded-full bg-ink"
          style={{ width: `${profile.percent}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] text-support">
        Missing: {profile.missing.map((m) => m.label.toLowerCase()).join(", ")}
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Activity feed with creator identity
 * ------------------------------------------------------------------------- */
function ActivityFeed({
  items,
  nowMs,
}: {
  items: ActivityItem[];
  nowMs: number;
}) {
  return (
    <section>
      <SectionTitle title="Recent activity" />
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-support">
          Invitation responses, drafts, and status changes will appear here.
        </p>
      ) : (
        <ol className="mt-2 divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              {item.actor ? (
                <Portrait
                  src={item.actor.avatarUrl}
                  name={item.actor.name}
                  className="h-9 w-9"
                  rounded="rounded-full"
                  textClass="text-[11px]"
                />
              ) : (
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-page text-[11px] font-semibold text-ink-subtle"
                >
                  N
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] text-ink">
                  {item.actor ? (
                    <span className="font-semibold">{item.actor.name} </span>
                  ) : null}
                  <span className={item.actor ? "text-ink-muted" : "font-semibold"}>
                    {item.actor
                      ? item.description.charAt(0).toLowerCase() +
                        item.description.slice(1)
                      : item.description}
                  </span>
                </p>
                <Link
                  href={item.href}
                  className="block truncate text-[12px] text-support hover:text-accent"
                >
                  {item.subject}
                </Link>
              </div>
              <time
                dateTime={item.createdAt}
                className="shrink-0 text-[12px] text-ink-subtle"
              >
                {relativeTime(item.createdAt, nowMs)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Recommendation row
 * ------------------------------------------------------------------------- */
function Recommendations({ creators }: { creators: RecommendedCreator[] }) {
  return (
    <section>
      <SectionTitle
        title="Creators to consider"
        action={
          <Link
            href="/brand/discover"
            className="text-[12px] font-semibold text-ink-muted hover:text-ink"
          >
            Open marketplace
          </Link>
        }
      />
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {creators.map((c) => (
          <li key={c.id}>
            <Link
              href={`/brand/creators/${c.slug}`}
              className="group flex gap-3 rounded-[10px] border border-line bg-surface p-3 transition-colors hover:border-line-strong"
            >
              <Portrait
                src={c.avatarUrl}
                name={c.fullName}
                className="h-16 w-16"
                rounded="rounded-[8px]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink group-hover:text-accent">
                  {c.fullName}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[12px] leading-4 text-support">
                  {c.headline}
                </span>
                <span className="tnum mt-1.5 block text-[12px] text-ink-muted">
                  {formatCompactCount(c.audienceSize)} ·{" "}
                  {formatPriceCents(c.priceCents, c.currency)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
