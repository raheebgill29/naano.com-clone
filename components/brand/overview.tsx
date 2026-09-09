import Link from "next/link";
import type { ReactNode } from "react";

import { PrimaryLink, SecondaryLink } from "@/components/ui/primitives";
import { PageHeader } from "@/components/workspace/ui";
import type {
  ActiveCampaignCard,
  ActivityItem,
  AttentionItem,
  BrandDashboardData,
  NextBestAction,
  ProfileCompletion,
} from "@/lib/brand/dashboard-data";
import { campaignStatusBadgeClass } from "@/lib/campaigns/status";
import type { CampaignStatus } from "@/lib/supabase/database.types";

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 48) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMonth = Math.round(diffDay / 30);
  return rtf.format(diffMonth, "month");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function IconShell({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "success" | "warning" | "danger" | "neutral";
}) {
  const tones = {
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    neutral: "bg-page text-ink-subtle",
  };
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${tones[tone]}`}
      aria-hidden
    >
      {children}
    </span>
  );
}

function Svg({ d, path }: { d?: string; path?: string }) {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <path
        d={d ?? path ?? ""}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricIcon({ kind }: { kind: "campaigns" | "collabs" | "drafts" | "done" }) {
  if (kind === "campaigns") {
    return (
      <Svg d="M5 19V6.8A1.8 1.8 0 0 1 6.8 5H14l5 5v9a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 19ZM14 5v5h5" />
    );
  }
  if (kind === "collabs") {
    return (
      <Svg d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 18.5c.7-2.4 2.7-3.5 4.5-3.5s3.8 1.1 4.5 3.5M13.5 15.2c.7-.4 1.6-.7 2.5-.7 1.6 0 3 .8 3.7 2.5" />
    );
  }
  if (kind === "drafts") {
    return (
      <Svg d="M8 7h11l-1.2 11.2A2 2 0 0 1 15.8 20H8.2A2 2 0 0 1 6.2 18.2L5 7h3ZM9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" />
    );
  }
  return (
    <Svg d="M20 7 10 17l-5-5" />
  );
}

function attentionIcon(kind: AttentionItem["kind"]) {
  switch (kind) {
    case "draft_review":
      return <Svg d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h4" />;
    case "schedule":
      return <Svg d="M8 3v3M16 3v3M4.5 8h15M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />;
    case "complete_collab":
      return <Svg d="M20 7 10 17l-5-5" />;
    case "pending_invite":
      return <Svg d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11ZM4.5 7l7.5 5.5L19.5 7" />;
    case "unread_messages":
      return <Svg d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v8A1.5 1.5 0 0 1 17.5 16H10l-4 3v-3H6.5A1.5 1.5 0 0 1 5 14.5v-8Z" />;
    case "deadline":
      return <Svg d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />;
    case "blocked_complete":
    default:
      return <Svg d="M12 9v4M12 17h.01M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" />;
  }
}

function attentionTone(kind: AttentionItem["kind"]): "accent" | "success" | "warning" | "danger" | "neutral" {
  switch (kind) {
    case "draft_review":
    case "deadline":
      return "warning";
    case "complete_collab":
      return "success";
    case "blocked_complete":
      return "neutral";
    default:
      return "accent";
  }
}

function statusPillClass(tone: AttentionItem["statusTone"]) {
  switch (tone) {
    case "urgent":
      return "bg-warning-soft text-warning";
    case "warning":
      return "bg-warning-soft text-warning";
    case "info":
      return "bg-accent-soft text-accent";
    default:
      return "bg-page text-support";
  }
}

function activityIcon(eventType: string) {
  if (eventType.includes("pause")) {
    return <Svg d="M8 6h3v12H8V6Zm5 0h3v12h-3V6Z" />;
  }
  if (eventType.includes("resume") || eventType.includes("activated")) {
    return <Svg d="M8 6.5v11l9-5.5-9-5.5Z" />;
  }
  if (eventType.includes("complet") || eventType === "approved" || eventType === "published") {
    return <Svg d="M20 7 10 17l-5-5" />;
  }
  if (eventType.includes("draft") || eventType.includes("revision")) {
    return <Svg d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />;
  }
  if (eventType.includes("invitation") || eventType === "accepted" || eventType === "declined") {
    return <Svg d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11ZM4.5 7l7.5 5.5L19.5 7" />;
  }
  return <Svg d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />;
}

export function BrandOverview({ data }: { data: BrandDashboardData }) {
  const { profile, metrics, attention, activeCampaigns, profileCompletion, nextActions, recentActivity } =
    data;
  const firstName = profile.full_name.split(/\s+/)[0] || profile.full_name;
  const company = data.brand?.company_name || "your brand";

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Brand workspace"
        title={`Welcome back, ${firstName}`}
        description={`Track campaigns and collaborations for ${company}.`}
        actions={
          <>
            <PrimaryLink href="/brand/discover" className="!w-auto">
              Explore creators
            </PrimaryLink>
            <SecondaryLink href="/brand/campaigns/new" className="!w-auto">
              Create campaign
            </SecondaryLink>
          </>
        }
      />

      <section
        aria-label="Workspace metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Active campaigns"
          value={metrics.activeCampaigns}
          href="/brand/campaigns?status=active"
          icon={<MetricIcon kind="campaigns" />}
          tone="accent"
        />
        <MetricCard
          label="Active collaborations"
          value={metrics.activeCollaborations}
          href="/brand/collaborations"
          icon={<MetricIcon kind="collabs" />}
          tone="accent"
        />
        <MetricCard
          label="Drafts awaiting review"
          value={metrics.draftsAwaitingReview}
          href="/brand/collaborations?filter=needs_review"
          icon={<MetricIcon kind="drafts" />}
          tone="warning"
        />
        <MetricCard
          label="Completed collaborations"
          value={metrics.completedCollaborations}
          href="/brand/collaborations?filter=completed"
          icon={<MetricIcon kind="done" />}
          tone="success"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <AttentionSection items={attention} />
          <ActiveCampaignsSection campaigns={activeCampaigns} />
          <RecentActivitySection items={recentActivity} />
        </div>

        <aside className="space-y-6 lg:col-span-4">
          {profileCompletion ? (
            <ProfileCompletionCard profile={profileCompletion} />
          ) : null}
          <NextActionsCard actions={nextActions} />
        </aside>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  href,
  icon,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  icon: ReactNode;
  tone: "accent" | "warning" | "success";
}) {
  return (
    <Link
      href={href}
      className="group rounded-[14px] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-[var(--shadow)]"
    >
      <div className="flex items-start justify-between gap-3">
        <IconShell tone={tone}>{icon}</IconShell>
        <span className="text-2xl font-semibold tracking-tight text-ink">
          {value}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-support group-hover:text-ink">
        {label}
      </p>
    </Link>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AttentionSection({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <SectionCard title="Needs your attention">
        <div className="rounded-[12px] border border-dashed border-line-strong bg-page px-4 py-8 text-center">
          <IconShell tone="success">
            <Svg d="M20 7 10 17l-5-5" />
          </IconShell>
          <p className="mt-3 text-sm font-semibold text-ink">You are all clear</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-support">
            No draft reviews, unread threads, or upcoming deadlines need action
            right now.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Needs your attention">
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <IconShell tone={attentionTone(item.kind)}>
                {attentionIcon(item.kind)}
              </IconShell>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <span
                    className={`rounded-[8px] px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(item.statusTone)}`}
                  >
                    {item.statusLabel}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-support">
                  {item.context}
                </p>
              </div>
            </div>
            <Link
              href={item.href}
              className="inline-flex shrink-0 items-center justify-center rounded-[12px] border border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-page sm:ml-auto"
            >
              {item.actionLabel}
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function ActiveCampaignsSection({
  campaigns,
}: {
  campaigns: ActiveCampaignCard[];
}) {
  return (
    <SectionCard
      title="Active campaigns"
      action={
        <Link
          href="/brand/campaigns"
          className="text-sm font-semibold text-accent hover:text-accent-hover"
        >
          View all campaigns
        </Link>
      }
    >
      {campaigns.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-line-strong bg-page px-4 py-8 text-center">
          <p className="text-sm font-semibold text-ink">No active campaigns yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-support">
            Create a campaign brief to start inviting creators and tracking
            delivery.
          </p>
          <div className="mt-4 flex justify-center">
            <SecondaryLink href="/brand/campaigns/new" className="!w-auto">
              Create campaign
            </SecondaryLink>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {campaigns.map((campaign) => (
            <li
              key={campaign.id}
              className="rounded-[12px] border border-line px-4 py-3.5 transition-colors duration-150 hover:bg-page/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">
                      {campaign.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${campaignStatusBadgeClass(campaign.status as CampaignStatus)}`}
                    >
                      {campaign.statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-support">
                    {campaign.progressLabel}
                  </p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    Target {formatDate(campaign.targetPublishDate)} ·{" "}
                    {campaign.totalInvitations} invitation
                    {campaign.totalInvitations === 1 ? "" : "s"}
                  </p>
                </div>
                <Link
                  href={`/brand/campaigns/${campaign.id}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-[12px] bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-hover"
                >
                  View campaign
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function RecentActivitySection({ items }: { items: ActivityItem[] }) {
  return (
    <SectionCard title="Recent activity">
      {items.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-line-strong bg-page px-4 py-8 text-center">
          <p className="text-sm font-semibold text-ink">No activity yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-support">
            Invitation responses, draft reviews, and campaign status changes
            will appear here as work begins.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-0">
          {items.map((item, index) => (
            <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < items.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-[17px] top-9 bottom-0 w-px bg-line"
                />
              ) : null}
              <IconShell tone="neutral">{activityIcon(item.eventType)}</IconShell>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-semibold text-ink">
                    {item.description}
                  </p>
                  <time
                    dateTime={item.createdAt}
                    className="shrink-0 text-xs text-ink-subtle"
                  >
                    {relativeTime(item.createdAt)}
                  </time>
                </div>
                <Link
                  href={item.href}
                  className="mt-0.5 inline-block truncate text-sm text-support hover:text-accent"
                >
                  {item.subject}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

function ProfileCompletionCard({
  profile,
}: {
  profile: ProfileCompletion;
}) {
  return (
    <section className="rounded-[14px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)]">
      <h2 className="text-base font-semibold text-ink">Company profile</h2>
      <p className="mt-1 text-sm text-support">{profile.companyName}</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-ink-muted">Profile completion</span>
          <span className="font-semibold text-ink">{profile.percent}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-page"
          role="progressbar"
          aria-valuenow={profile.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Company profile completion"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150"
            style={{ width: `${profile.percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-subtle">
          {profile.filled} of {profile.total} fields complete
        </p>
      </div>

      <dl className="mt-4 space-y-2.5 text-sm">
        <div>
          <dt className="text-xs font-medium text-ink-subtle">Industry</dt>
          <dd className="mt-0.5 text-ink">
            {profile.industry?.trim() || (
              <span className="text-support">Add your industry</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-ink-subtle">Website</dt>
          <dd className="mt-0.5 text-ink">
            {profile.website?.trim() ? (
              <a
                href={profile.website}
                className="font-medium text-accent hover:text-accent-hover"
                target="_blank"
                rel="noreferrer"
              >
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span className="text-support">Add a company website</span>
            )}
          </dd>
        </div>
      </dl>

      {profile.missing.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {profile.missing.map((field) => (
            <li
              key={field.key}
              className="flex items-center gap-2 text-xs text-support"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
                aria-hidden
              />
              Complete {field.label.toLowerCase()}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-line pt-4 text-xs font-medium text-success">
          Profile looks complete
        </p>
      )}
    </section>
  );
}

function NextActionsCard({ actions }: { actions: NextBestAction[] }) {
  return (
    <section className="rounded-[14px] border border-line bg-surface p-5 shadow-[var(--shadow-sm)]">
      <h2 className="text-base font-semibold text-ink">Next best actions</h2>
      {actions.length === 0 ? (
        <p className="mt-3 text-sm text-support">
          You are caught up. Explore creators when you are ready to grow.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {actions.map((action) => (
            <li
              key={action.id}
              className="rounded-[12px] border border-line px-3.5 py-3"
            >
              <p className="text-sm font-semibold text-ink">{action.title}</p>
              <p className="mt-1 text-sm text-support">{action.description}</p>
              <Link
                href={action.href}
                className="mt-2 inline-block text-sm font-semibold text-accent hover:text-accent-hover"
              >
                {action.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
