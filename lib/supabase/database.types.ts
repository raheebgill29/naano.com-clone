export type UserRole = "brand" | "creator";
export type PublicationStatus = "draft" | "published";
export type AvailabilityStatus = "available" | "unavailable";
export type CampaignStatus = "draft" | "active" | "completed" | "archived";
export type CampaignCreatorStatus =
  | "booking_pending"
  | "accepted"
  | "declined"
  | "cancelled";

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
  invited_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
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
          invited_at?: string;
          accepted_at?: string | null;
          declined_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<
            CampaignCreator,
            "id" | "created_at" | "campaign_id" | "creator_id" | "invited_at" | "price_cents" | "post_count_snapshot" | "currency"
          > & {
            updated_at?: string;
          }
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
