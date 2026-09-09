export type UserRole = "brand" | "creator";
export type PublicationStatus = "draft" | "published";
export type AvailabilityStatus = "available" | "unavailable";
export type CampaignStatus = "draft" | "active" | "completed" | "archived";
export type CampaignCreatorStatus =
  | "booking_pending"
  | "accepted"
  | "draft_submitted"
  | "revision_requested"
  | "approved"
  | "scheduled"
  | "published"
  | "completed"
  | "declined"
  | "cancelled";

export type ContentSubmissionType = "draft" | "publish";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Brand = {
  id: string;
  profile_id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  logo_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Creator = {
  id: string;
  profile_id: string;
  slug: string;
  headline: string;
  bio: string | null;
  topics: string[];
  audience_size: number;
  audience_summary: string | null;
  price_cents: number;
  currency: string;
  linkedin_url: string | null;
  location: string | null;
  languages: string[];
  publication_status: PublicationStatus;
  availability: AvailabilityStatus;
  is_discoverable: boolean;
  created_at: string;
  updated_at: string;
};

export type SavedCreator = {
  id: string;
  brand_id: string;
  creator_id: string;
  created_at: string;
};

export type Campaign = {
  id: string;
  brand_id: string;
  campaign_name: string;
  product_or_company: string;
  objective: string;
  description: string;
  key_messages: string[];
  creator_guidelines: string;
  deliverable_type: string;
  post_count: number;
  target_publish_date: string;
  currency: string;
  budget_cents: number;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
};

export type CampaignCreator = {
  id: string;
  campaign_id: string;
  creator_id: string;
  status: CampaignCreatorStatus;
  price_cents: number;
  currency: string;
  post_count_snapshot: number;
  decline_reason: string | null;
  published_url: string | null;
  scheduled_publish_at: string | null;
  latest_feedback: string | null;
  cancel_reason: string | null;
  invited_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  revision_requested_at: string | null;
  approved_at: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentSubmission = {
  id: string;
  campaign_creator_id: string;
  submission_type: ContentSubmissionType;
  version: number;
  body: string | null;
  asset_url: string | null;
  published_url: string | null;
  notes: string | null;
  submitted_by: string;
  created_at: string;
};

export type CollaborationEvent = {
  id: string;
  campaign_creator_id: string;
  event_type: string;
  actor_profile_id: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CollaborationMessage = {
  id: string;
  campaign_creator_id: string;
  sender_profile_id: string;
  body: string;
  client_message_id: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  recipient_profile_id: string;
  actor_profile_id: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string;
  campaign_creator_id: string | null;
  dedupe_key: string;
  read_at: string | null;
  created_at: string;
};

export type MarketplaceCreator = Pick<
  Creator,
  | "id"
  | "slug"
  | "headline"
  | "bio"
  | "topics"
  | "audience_size"
  | "audience_summary"
  | "price_cents"
  | "currency"
  | "linkedin_url"
  | "location"
  | "languages"
  | "publication_status"
  | "availability"
  | "is_discoverable"
> & {
  full_name: string;
  avatar_url: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          role: UserRole;
          full_name: string;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Profile, "id" | "created_at"> & { updated_at?: string }
        >;
        Relationships: [];
      };
      brands: {
        Row: Brand;
        Insert: {
          id?: string;
          profile_id: string;
          company_name: string;
          website?: string | null;
          industry?: string | null;
          logo_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Brand, "id" | "created_at"> & { updated_at?: string }
        >;
        Relationships: [];
      };
      creators: {
        Row: Creator;
        Insert: {
          id?: string;
          profile_id: string;
          slug: string;
          headline: string;
          bio?: string | null;
          topics?: string[];
          audience_size: number;
          audience_summary?: string | null;
          price_cents: number;
          currency?: string;
          linkedin_url?: string | null;
          location?: string | null;
          languages?: string[];
          publication_status?: PublicationStatus;
          availability?: AvailabilityStatus;
          is_discoverable?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Creator, "id" | "created_at" | "slug"> & { updated_at?: string }
        >;
        Relationships: [];
      };
      saved_creators: {
        Row: SavedCreator;
        Insert: {
          id?: string;
          brand_id: string;
          creator_id: string;
          created_at?: string;
        };
        Update: Partial<Omit<SavedCreator, "id" | "created_at">>;
        Relationships: [];
      };
      campaigns: {
        Row: Campaign;
        Insert: {
          id?: string;
          brand_id: string;
          campaign_name: string;
          product_or_company: string;
          objective: string;
          description: string;
          key_messages?: string[];
          creator_guidelines: string;
          deliverable_type: string;
          post_count: number;
          target_publish_date: string;
          currency?: string;
          budget_cents: number;
          status?: CampaignStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Campaign, "id" | "created_at" | "brand_id"> & {
            brand_id?: string;
            updated_at?: string;
          }
        >;
        Relationships: [];
      };
      campaign_creators: {
        Row: CampaignCreator;
        Insert: {
          id?: string;
          campaign_id: string;
          creator_id: string;
          status?: CampaignCreatorStatus;
          price_cents: number;
          currency?: string;
          post_count_snapshot: number;
          decline_reason?: string | null;
          published_url?: string | null;
          scheduled_publish_at?: string | null;
          latest_feedback?: string | null;
          cancel_reason?: string | null;
          invited_at?: string;
          accepted_at?: string | null;
          declined_at?: string | null;
          cancelled_at?: string | null;
          revision_requested_at?: string | null;
          approved_at?: string | null;
          scheduled_at?: string | null;
          published_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            CampaignCreator,
            | "id"
            | "created_at"
            | "campaign_id"
            | "creator_id"
            | "invited_at"
            | "price_cents"
            | "post_count_snapshot"
            | "currency"
          > & {
            updated_at?: string;
          }
        >;
        Relationships: [];
      };
      content_submissions: {
        Row: ContentSubmission;
        Insert: {
          id?: string;
          campaign_creator_id: string;
          submission_type: ContentSubmissionType;
          version: number;
          body?: string | null;
          asset_url?: string | null;
          published_url?: string | null;
          notes?: string | null;
          submitted_by: string;
          created_at?: string;
        };
        Update: Partial<ContentSubmission>;
        Relationships: [];
      };
      collaboration_events: {
        Row: CollaborationEvent;
        Insert: {
          id?: string;
          campaign_creator_id: string;
          event_type: string;
          actor_profile_id?: string | null;
          message?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<CollaborationEvent>;
        Relationships: [];
      };
      collaboration_messages: {
        Row: CollaborationMessage;
        Insert: {
          id?: string;
          campaign_creator_id: string;
          sender_profile_id: string;
          body: string;
          client_message_id?: string | null;
          created_at?: string;
        };
        Update: Partial<CollaborationMessage>;
        Relationships: [];
      };
      collaboration_thread_reads: {
        Row: {
          campaign_creator_id: string;
          profile_id: string;
          last_read_at: string;
        };
        Insert: {
          campaign_creator_id: string;
          profile_id: string;
          last_read_at?: string;
        };
        Update: {
          last_read_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: {
          id?: string;
          recipient_profile_id: string;
          actor_profile_id?: string | null;
          type: string;
          title: string;
          body?: string | null;
          href: string;
          campaign_creator_id?: string | null;
          dedupe_key: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Pick<Notification, "read_at" | "title" | "body" | "href">
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      ensure_own_profile: {
        Args: {
          p_role: UserRole;
          p_full_name: string;
        };
        Returns: Profile;
      };
      collab_submit_draft: {
        Args: {
          p_campaign_creator_id: string;
          p_body: string;
          p_asset_url?: string | null;
          p_notes?: string | null;
        };
        Returns: CampaignCreator;
      };
      collab_request_revision: {
        Args: {
          p_campaign_creator_id: string;
          p_feedback: string;
        };
        Returns: CampaignCreator;
      };
      collab_approve_draft: {
        Args: { p_campaign_creator_id: string };
        Returns: CampaignCreator;
      };
      collab_schedule: {
        Args: {
          p_campaign_creator_id: string;
          p_scheduled_publish_at: string;
        };
        Returns: CampaignCreator;
      };
      collab_submit_published_url: {
        Args: {
          p_campaign_creator_id: string;
          p_published_url: string;
        };
        Returns: CampaignCreator;
      };
      collab_complete: {
        Args: { p_campaign_creator_id: string };
        Returns: CampaignCreator;
      };
      collab_cancel: {
        Args: {
          p_campaign_creator_id: string;
          p_reason: string;
        };
        Returns: CampaignCreator;
      };
      collab_send_message: {
        Args: {
          p_campaign_creator_id: string;
          p_body: string;
          p_client_message_id?: string | null;
        };
        Returns: CollaborationMessage;
      };
      collab_mark_thread_read: {
        Args: { p_campaign_creator_id: string };
        Returns: undefined;
      };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: undefined;
      };
      mark_all_notifications_read: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      publication_status: PublicationStatus;
      availability_status: AvailabilityStatus;
      campaign_status: CampaignStatus;
      campaign_creator_status: CampaignCreatorStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
