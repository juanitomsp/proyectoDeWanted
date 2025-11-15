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
  address: string | null; // AÑADIDO
}

export const useLocations = (initialLocationId?: string) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<AccessibleLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Memoize loadLocations para evitar que se re-declare en cada render
  // y poder usarlo en useEffect de forma segura.
  const loadLocations = useMemo(() => async (userId: string, preferredLocationId?: string) => {
    try {
      // CORRECCIÓN: La consulta ahora filtra por el 'owner_id' del negocio
      // usando una relación interna (!inner) y aun así selecciona
      // todos los campos necesarios de 'locations'.
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, location_type, business_id, address, businesses!inner(owner_id)") // AÑADIDO 'address'
        .eq("businesses.owner_id", userId) // Filtra por el ID del dueño
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
      
      // Asegura que selectedLocation tenga un valor válido
      const newSelectedLocation = preferred ? preferred.id : locationsData[0]?.id || "";
      setSelectedLocation(newSelectedLocation);
      
      return locationsData; // Devuelve los datos para uso inmediato si es necesario

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
  }, [navigate, toast]); // Dependencias estables

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
      if (!isMounted) return; // Evitar actualizaciones si el componente está desmontado
      if (!session) {
        navigate("/auth");
        return;
      }

      if (session.user.id !== user?.id) {
        setUser(session.user);
        await loadLocations(session.user.id, initialLocationId);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, initialLocationId, loadLocations, user?.id]); // Incluir loadLocations

  const selectedLocationData = useMemo(
    () => locations.find((location) => location.id === selectedLocation) || null,
    [locations, selectedLocation]
  );

  const refreshLocations = async () => {
    if (user) {
      setLoading(true);
      await loadLocations(user.id, selectedLocation || initialLocationId);
    }
  };

  return {
    user,
    locations,
    selectedLocation,
    setSelectedLocation,
    loading,
    refreshLocations, // Exponer la función de refresco
    selectedLocationData,
  };
};