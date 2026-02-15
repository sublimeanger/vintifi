import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  selling_categories: string[];
  experience_level: string;
  active_listing_count: string;
  primary_goal: string;
  subscription_tier: string;
  onboarding_completed: boolean;
  timezone: string;
};

type UsageCredits = {
  price_checks_used: number;
  optimizations_used: number;
  vintography_used: number;
  credits_limit: number;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  credits: UsageCredits | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshCredits: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState<UsageCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile(data as Profile | null);
  };

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase
      .from("usage_credits")
      .select("price_checks_used, optimizations_used, vintography_used, credits_limit")
      .eq("user_id", userId)
      .maybeSingle();
    setCredits(data as UsageCredits | null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const refreshCredits = async () => {
    if (user) await fetchCredits(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
        fetchCredits(s.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
        fetchCredits(s.user.id);
      } else {
        setProfile(null);
        setCredits(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setCredits(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, credits, loading, signOut, refreshProfile, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
