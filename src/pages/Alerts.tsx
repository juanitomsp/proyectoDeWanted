import { useEffect, useMemo, useState } from "react";
import { useLocation as useRouterLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocations } from "@/hooks/use-locations";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar, Loader2, PackageX } from "lucide-react";
 
interface AlertBatch {
  id: string;
  batch_number: string | null;
  expiry_date: string | null;
  remaining_quantity: number;
  unit: string | null;
  status: "warning" | "critical" | "expired";
  storage_type: "refrigerated" | "frozen" | "dry" | "ambient";
  notes: string | null;
  product: {
    id: string;
    name: string;
  } | null;
}

const alertConfig: Record<AlertBatch["status"], { label: string; className: string }> = {
  warning: { label: "Próximo a caducar", className: "bg-status-warning-bg text-status-warning-foreground" },
  critical: { label: "Crítico", className: "bg-status-critical-bg text-status-critical" },
  expired: { label: "Caducado", className: "bg-red-100 text-red-600" },
};

const formatDate = (value: string | null) => {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-ES");
};

const Alerts = () => {
  const routerLocation = useRouterLocation();
  const locationState = routerLocation.state as { locationId?: string } | null;
  const { toast } = useToast();
  const { locations, selectedLocation, setSelectedLocation, loading, selectedLocationData } = useLocations(
    locationState?.locationId
  );
  const [batches, setBatches] = useState<AlertBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [expiryBatch, setExpiryBatch] = useState<AlertBatch | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [updating, setUpdating] = useState(false);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "warning" | "critical" | "expired">("all");

  useEffect(() => {
    if (!selectedLocation) return;
    loadAlerts(selectedLocation);
  }, [selectedLocation]);

  const loadAlerts = async (locationId: string) => {
    setLoadingBatches(true);
    try {
      const { data, error } = await supabase
        .from("batches")
        .select(
          `id, batch_number, expiry_date, remaining_quantity, unit, status, storage_type, notes,
           product:product_id ( id, name )`
        )
        .eq("location_id", locationId)
        .in("status", ["warning", "critical", "expired"])
        .order("expiry_date", { ascending: true, nullsFirst: true });

      if (error) throw error;

      setBatches((data || []) as AlertBatch[]);
    } catch (error: any) {
      console.error("Error loading alerts", error);
      toast({
        title: "No se pudieron cargar las alertas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingBatches(false);
    }
  };

  const summary = useMemo(() => {
    return batches.reduce(
      (acc, batch) => {
        acc[batch.status] += 1;
        acc.total += 1;
        return acc;
      },
      { warning: 0, critical: 0, expired: 0, total: 0 }
    );
  }, [batches]);

  const filteredBatches = useMemo(() => {
    if (statusFilter === "all") return batches;
    return batches.filter(batch => batch.status === statusFilter);
  }, [batches, statusFilter]);

  const openExpiryDialog = (batch: AlertBatch) => {
    setExpiryBatch(batch);
    setNewExpiryDate(batch.expiry_date || "");
    setExpiryDialogOpen(true);
  };

  const handleUpdateExpiry = async () => {
    if (!expiryBatch) return;
    if (!newExpiryDate) {
      toast({
        title: "Fecha inválida",
        description: "Introduce una fecha de caducidad",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdating(true);
      const { error } = await supabase
        .from("batches")
        .update({ expiry_date: newExpiryDate })
        .eq("id", expiryBatch.id);

      if (error) throw error;

      toast({
        title: "Caducidad actualizada",
        description: "Se ha actualizado la fecha de caducidad",
      });

      setExpiryDialogOpen(false);
      setExpiryBatch(null);
      if (selectedLocation) {
        await loadAlerts(selectedLocation);
      }
    } catch (error: any) {
      toast({
        title: "No se pudo actualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleAcknowledge = async (batch: AlertBatch) => {
    try {
      const reviewNote = `Revisado el ${new Date().toLocaleString("es-ES")}`;
      const existingNotes = batch.notes ? `${batch.notes}\n` : "";
      const { error } = await supabase
        .from("batches")
        .update({ notes: `${existingNotes}${reviewNote}` })
        .eq("id", batch.id);

      if (error) throw error;

      setAcknowledged((prev) => ({ ...prev, [batch.id]: true }));
      toast({
        title: "Alerta revisada",
        description: "Se ha registrado la revisión de este lote.",
      });
    } catch (error: any) {
      toast({
        title: "No se pudo marcar como revisado",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Alertas de Caducidad</h1>
            <p className="text-muted-foreground">
              Lotes que requieren atención inmediata en {selectedLocationData?.name || "tu local"}.
            </p>
          </div>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecciona un local" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className={`border-status-warning bg-status-warning-bg/40 cursor-pointer transition-all ${
              statusFilter === "warning" ? "ring-2 ring-status-warning-foreground" : "hover:bg-status-warning-bg/60"
            }`}
            onClick={() => setStatusFilter(statusFilter === "warning" ? "all" : "warning")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-status-warning-foreground">Próximos a caducar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-status-warning-foreground">{summary.warning}</p>
            </CardContent>
          </Card>

          <Card 
            className={`border-status-critical bg-status-critical-bg/40 cursor-pointer transition-all ${
              statusFilter === "critical" ? "ring-2 ring-status-critical" : "hover:bg-status-critical-bg/60"
            }`}
            onClick={() => setStatusFilter(statusFilter === "critical" ? "all" : "critical")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-status-critical">Críticos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-status-critical">{summary.critical}</p>
            </CardContent>
          </Card>

          <Card 
            className={`border bg-red-100 cursor-pointer transition-all ${
              statusFilter === "expired" ? "ring-2 ring-red-600" : "hover:bg-red-200/60"
            }`}
            onClick={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Caducados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{summary.expired}</p>
            </CardContent>
          </Card>
        </div>

        {statusFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Filtrado por: {alertConfig[statusFilter].label}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
              Limpiar filtro
            </Button>
          </div>
        )}

        {loading || loadingBatches ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredBatches.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-64">
              <PackageX className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {statusFilter === "all" 
                  ? "¡Excelente! No hay alertas activas"
                  : `No hay lotes con estado: ${alertConfig[statusFilter].label}`
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {statusFilter === "all" 
                  ? "Todos los lotes están en condiciones óptimas."
                  : "Prueba con otro filtro para ver más alertas."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Lotes con alerta</CardTitle>
              <CardDescription>Actualiza fechas de caducidad o marca acciones correctivas</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredBatches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay alertas activas en este momento.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Caducidad</TableHead>
                      <TableHead>Disponible</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <div className="font-medium">{batch.product?.name || "Sin nombre"}</div>
                          <p className="text-xs text-muted-foreground">Almacenamiento: {batch.storage_type}</p>
                        </TableCell>
                        <TableCell>{batch.batch_number || "Sin lote"}</TableCell>
                        <TableCell>{formatDate(batch.expiry_date)}</TableCell>
                        <TableCell>
                          {Number(batch.remaining_quantity ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })}{" "}
                          {batch.unit || "uds"}
                        </TableCell>
                        <TableCell>
                          <Badge className={alertConfig[batch.status].className}>
                            {alertConfig[batch.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openExpiryDialog(batch)}>
                            <Calendar className="mr-2 h-4 w-4" />
                            Ajustar fecha
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcknowledge(batch)}
                            disabled={acknowledged[batch.id]}
                          >
                            <PackageX className="mr-2 h-4 w-4" />
                            {acknowledged[batch.id] ? "Revisado" : "Marcar revisado"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar fecha de caducidad</DialogTitle>
            <DialogDescription>
              Ajusta la fecha del lote {expiryBatch?.batch_number || "sin referencia"} si has validado una nueva caducidad.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="expiry-date">Nueva fecha de caducidad</Label>
              <Input
                id="expiry-date"
                type="date"
                value={newExpiryDate}
                onChange={(event) => setNewExpiryDate(event.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Fecha actual: {expiryBatch?.expiry_date ? formatDate(expiryBatch.expiry_date) : "Sin fecha registrada"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryDialogOpen(false)} disabled={updating}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateExpiry} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alerts;