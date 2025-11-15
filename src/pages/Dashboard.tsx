import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  AlertTriangle, 
  FileText,
  Camera,
  BarChart3,
  Settings,
  LogOut,
  MapPin,
  Loader2, // Importado
  Plus // Importado
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocations } from "@/hooks/use-locations"; // Importar el hook
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Importar Dialog
import { Input } from "@/components/ui/input"; // Importar Input
import { Label } from "@/components/ui/label"; // Importar Label

interface AlertStats {
  critical: number;
  warning: number;
  expired: number;
  ok: number;
  total: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Usar el hook de locaciones
  const { 
    user, 
    locations, 
    selectedLocation, 
    setSelectedLocation, 
    loading, 
    refreshLocations 
  } = useLocations();

  const [alerts, setAlerts] = useState<AlertStats>({ critical: 0, warning: 0, expired: 0, ok: 0, total: 0 });
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // State para el modal de añadir local
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationType, setNewLocationType] = useState<string>("restaurant");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  // Cargar alertas cuando selectedLocation cambie
  useEffect(() => {
    if (selectedLocation) {
      loadAlerts(selectedLocation);
    }
  }, [selectedLocation]);

  const loadAlerts = async (locationId: string) => {
    setLoadingAlerts(true);
    try {
      const { data, error } = await supabase
        .from("batches")
        .select("status")
        .eq("location_id", locationId)
        .gt("remaining_quantity", 0);

      if (error) throw error;

      const stats = data.reduce(
        (acc: AlertStats, batch) => {
          if (batch.status in acc) {
            acc[batch.status as keyof AlertStats]++;
          }
          acc.total++;
          return acc;
        },
        { critical: 0, warning: 0, expired: 0, ok: 0, total: 0 }
      );

      setAlerts(stats);
    } catch (error: any) {
      console.error("Error loading alerts:", error);
      toast({
        title: "Error al cargar alertas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Lógica para guardar el nuevo local
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName) {
      toast({ title: "Nombre requerido", description: "Por favor, introduce un nombre para el local.", variant: "destructive" });
      return;
    }
    
    // --- LÍNEA CORREGIDA ---
    // Comprueba si el usuario existe O si la longitud de locales es 0
    if (!user || locations.length === 0) {
      toast({ title: "Error", description: "No se pudo encontrar la información del negocio.", variant: "destructive" });
      return;
    }

    const businessId = locations[0].business_id; 

    setIsSavingLocation(true);
    try {
      const { error } = await supabase.from("locations").insert({
        business_id: businessId,
        name: newLocationName,
        location_type: newLocationType as any,
        address: newLocationAddress || null,
      });

      if (error) throw error;

      toast({ title: "¡Local añadido!", description: `${newLocationName} ha sido creado.` });
      setIsModalOpen(false);
      setNewLocationName("");
      setNewLocationType("restaurant");
      setNewLocationAddress("");
      
      // Refrescar la lista de locales
      await refreshLocations(); 

    } catch (error: any) {
      toast({ title: "Error al crear el local", description: error.message, variant: "destructive" });
    } finally {
      setIsSavingLocation(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando tu cuenta...</p>
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
              <p className="text-3xl font-bold text-status-warning-foreground">{alerts.warning + alerts.critical + alerts.expired}</p>
              <p className="text-xs text-muted-foreground mt-1">lotes próximos a caducar, críticos o caducados</p>
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
              <p className="text-3xl font-bold">{loadingAlerts ? <Loader2 className="h-8 w-8 animate-spin" /> : alerts.total}</p>
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

          {/* Tarjeta de Configuración ahora abre el Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <Settings className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle>Configuración</CardTitle>
                      <CardDescription>Añadir/gestionar locales</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Local</DialogTitle>
                <DialogDescription>
                  Añade un nuevo restaurante, bar o tienda a tu negocio.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddLocation} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="location-name">Nombre del Local *</Label>
                  <Input id="location-name" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location-type">Tipo de Establecimiento *</Label>
                  <Select value={newLocationType} onValueChange={setNewLocationType}>
                    <SelectTrigger id="location-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurante</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="cafe">Cafetería</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="store">Tienda</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location-address">Dirección</Label>
                  <Input id="location-address" value={newLocationAddress} onChange={(e) => setNewLocationAddress(e.target.value)} placeholder="Calle Principal 123" />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)} disabled={isSavingLocation}>Cancelar</Button>
                  <Button type="submit" disabled={isSavingLocation}>
                    {isSavingLocation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Local
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

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