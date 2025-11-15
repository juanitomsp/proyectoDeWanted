import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "./use-toast";
import type { Database } from "@/integrations/supabase/types";

export interface AccessibleLocation {
  id: string;
  name: string;
  location_type: string;
  business_id: string;
}

export const useLocations = (initialLocationId?: string) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<AccessibleLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await loadLocations(session.user.id, initialLocationId);
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await loadLocations(session.user.id, initialLocationId);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  // We intentionally omit loadLocations from deps to avoid recreating function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, initialLocationId]);

  const loadLocations = async (userId: string, preferredLocationId?: string) => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, location_type, business_id")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        navigate("/onboarding");
        return;
      }

      const locationsData = data as AccessibleLocation[];
      setLocations(locationsData);

      const preferred = preferredLocationId
        ? locationsData.find((location) => location.id === preferredLocationId)
        : undefined;
      setSelectedLocation(preferred ? preferred.id : locationsData[0].id);
    } catch (error: any) {
      console.error("Error loading locations", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialLocationId || !locations.length) {
      return;
    }

    if (!selectedLocation) {
      const preferred = locations.find((location) => location.id === initialLocationId);
      if (preferred) {
        setSelectedLocation(preferred.id);
      }
    }
  }, [initialLocationId, locations, selectedLocation]);

  const selectedLocationData = useMemo(
    () => locations.find((location) => location.id === selectedLocation) || null,
    [locations, selectedLocation]
  );

  const refreshLocations = async () => {
    if (user) {
      await loadLocations(user.id, selectedLocation || initialLocationId);
    }
  };

  return {
    user,
    locations,
    selectedLocation,
    setSelectedLocation,
    loading,
    refreshLocations,
    selectedLocationData,
  };
};