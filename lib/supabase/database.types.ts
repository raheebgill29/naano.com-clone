export type UserRole = "brand" | "creator";

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
  headline: string;
  bio: string | null;
  topics: string[];
  audience_size: number;
  audience_summary: string | null;
  price_cents: number;
  currency: string;
  linkedin_url: string | null;
  is_discoverable: boolean;
  created_at: string;
  updated_at: string;
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
          headline: string;
          bio?: string | null;
          topics?: string[];
          audience_size: number;
          audience_summary?: string | null;
          price_cents: number;
          currency?: string;
          linkedin_url?: string | null;
          is_discoverable?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Creator, "id" | "created_at"> & { updated_at?: string }
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
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
