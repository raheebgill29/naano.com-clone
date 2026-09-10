import { getCollaborationDetail } from "@/lib/collaborations/queries";
import { listMessageInbox } from "@/lib/messages/queries";
import type { UserRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type CollaborationMessagePreview = {
  lastPreview: string | null;
  lastAt: string | null;
  unread: boolean;
  otherPartyName: string;
};

export async function loadCollaborationDetailWorkspace(
  id: string,
  role: UserRole,
) {
  const detail = await getCollaborationDetail(id);
  if (detail.error || !detail.collab) {
    return {
      ...detail,
      messagePreview: null as CollaborationMessagePreview | null,
      actorNames: {} as Record<string, string>,
    };
  }

  const [inbox, actorNames] = await Promise.all([
    listMessageInbox(role),
    loadActorNames(detail.events.map((e) => e.actor_profile_id)),
  ]);

  const thread = inbox.items.find((item) => item.id === id);
  const messagePreview: CollaborationMessagePreview | null = thread
    ? {
        lastPreview: thread.lastPreview,
        lastAt: thread.lastAt,
        unread: thread.unread,
        otherPartyName: thread.otherPartyName,
      }
    : {
        lastPreview: null,
        lastAt: null,
        unread: false,
        otherPartyName:
          role === "brand"
            ? (detail.creator?.full_name ?? "Creator")
            : (detail.brand?.company_name ?? "Brand"),
      };

  return {
    ...detail,
    messagePreview,
    actorNames,
  };
}

async function loadActorNames(
  ids: Array<string | null>,
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (!unique.length) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,full_name")
    .in("id", unique);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.full_name;
  }
  return map;
}
