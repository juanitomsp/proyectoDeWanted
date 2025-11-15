import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  FileText,
  Camera,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  MapPin,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Location {
  id: string;
  name: string;
  location_type: string;
}

interface AlertStats {
  critical: number;
  warning: number;
  ok: number;
  total: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [alerts, setAlerts] = useState<AlertStats>({ critical: 0, warning: 0, ok: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadLocations(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadLocations = async (userId: string) => {
    try {
      // Get user's locations
      const { data, error } = await supabase
        .from("locations")
        .select(`
          id,
          name,
          location_type,
          businesses!inner(owner_id)
        `)
        .eq("businesses.owner_id", userId)
        .eq("is_active", true) as { data: Location[] | null; error: any };

      if (error) throw error;

      if (!data || data.length === 0) {
        // No locations, redirect to onboarding
        navigate("/onboarding");
        return;
      }

      setLocations(data);
      setSelectedLocation(data[0].id);
      loadAlerts(data[0].id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async (locationId: string) => {
    try {
      const { data, error } = await supabase
        .from("batches")
        .select("status")
        .eq("location_id", locationId)
        .gt("remaining_quantity", 0);

      if (error) throw error;

      const stats = data.reduce(
        (acc, batch) => {
          acc[batch.status]++;
          acc.total++;
          return acc;
        },
        { critical: 0, warning: 0, ok: 0, expired: 0, total: 0 }
      );

      setAlerts(stats);
    } catch (error: any) {
      console.error("Error loading alerts:", error);
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
    loadAlerts(locationId);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">LotTrack</h1>
                <p className="text-sm text-muted-foreground">Gestión de Inventario</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedLocation} onValueChange={handleLocationChange}>
                <SelectTrigger className="w-[200px]">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Alerts Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card
            className="border-status-ok bg-status-ok-bg/50 cursor-pointer hover:bg-status-ok-bg/70 transition-colors"
            onClick={() =>
              navigate("/inventory", { state: { locationId: selectedLocation, filter: "ok" } })
            }
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-status-ok">En Buen Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-status-ok">{alerts.ok}</p>
            </CardContent>
          </Card>
          
          <Card
            className="border-status-warning bg-status-warning-bg/50 cursor-pointer hover:bg-status-warning-bg/70 transition-colors"
            onClick={() =>
              navigate("/alerts", { state: { locationId: selectedLocation } })
            }
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-status-warning-foreground">Alertas de Caducidad</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-status-warning-foreground">{alerts.warning + alerts.critical}</p>
              <p className="text-xs text-muted-foreground mt-1">lotes próximos a caducar o críticos</p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors" 
            onClick={() => navigate("/inventory", { state: { locationId: selectedLocation } })}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alerts.total}</p>
              <p className="text-xs text-muted-foreground mt-1">ver todo el inventario</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/register-delivery", { state: { locationId: selectedLocation } })}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Registrar Albarán</CardTitle>
                  <CardDescription>Escanear nueva entrada</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/inventory", { state: { locationId: selectedLocation } })}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <CardTitle>Inventario</CardTitle>
                  <CardDescription>Ver lotes y productos</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

         <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/marketplace", { state: { locationId: selectedLocation } })}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-status-warning/10 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-status-warning-foreground" />
                </div>
                <div>
                  <CardTitle>Marketplace Interno</CardTitle>
                  <CardDescription>Redistribuir productos</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

         <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/haccp", { state: { locationId: selectedLocation } })}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-secondary p-3 rounded-lg">
                  <FileText className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle>Generar PDF HACCP</CardTitle>
                  <CardDescription>Informe mensual</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() =>
              toast({
                title: "Próximamente",
                description: "El módulo de estadísticas estará disponible en la siguiente iteración.",
              })
            }
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-muted p-3 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Estadísticas</CardTitle>
                  <CardDescription>Análisis y reportes</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

           <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() =>
              toast({
                title: "Configura tus locales",
                description: "Gestiona locales y usuarios desde el onboarding inicial por ahora.",
              })
            }
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-muted p-3 rounded-lg">
                  <Settings className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Configuración</CardTitle>
                  <CardDescription>Locales y usuarios</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas entradas y movimientos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay actividad reciente</p>
              <p className="text-sm mt-2">Registra tu primer albarán para comenzar</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
