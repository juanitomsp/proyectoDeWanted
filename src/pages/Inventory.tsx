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
import { Loader2, PackageSearch, RefreshCw } from "lucide-react";

interface BatchRow {
  id: string;
  batch_number: string | null;
  quantity: number;
  remaining_quantity: number;
  unit: string | null;
  expiry_date: string | null;
  status: "ok" | "warning" | "critical" | "expired";
  storage_type: "refrigerated" | "frozen" | "dry" | "ambient";
  entry_date: string;
  notes: string | null;
  product: {
    id: string;
    name: string;
  } | null;
}

interface ProductSummary {
  productId: string;
  name: string;
  totalQuantity: number;
  unit: string;
  nextExpiry: string | null;
  status: "ok" | "warning" | "critical" | "expired";
}

const statusConfig: Record<BatchRow["status"], { label: string; className: string }> = {
  ok: { label: "En buen estado", className: "bg-status-ok/10 text-status-ok" },
  warning: { label: "Próximo a caducar", className: "bg-status-warning-bg text-status-warning-foreground" },
  critical: { label: "Crítico", className: "bg-status-critical-bg text-status-critical" },
  expired: { label: "Caducado", className: "bg-red-100 text-red-600" },
};

const formatDate = (value: string | null) => {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleDateString("es-ES");
  } catch (error) {
    return value;
  }
};

const Inventory = () => {
  const routerLocation = useRouterLocation();
  const locationState = routerLocation.state as { locationId?: string; filter?: "ok" | "all" } | null;
  const { toast } = useToast();
  const { locations, selectedLocation, setSelectedLocation, loading, selectedLocationData } = useLocations(
    locationState?.locationId
  );
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustBatch, setAdjustBatch] = useState<BatchRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("0");
  const [adjusting, setAdjusting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "ok">(locationState?.filter || "all");

  useEffect(() => {
    if (!selectedLocation) return;
    loadBatches(selectedLocation);
  }, [selectedLocation]);

  const loadBatches = async (locationId: string) => {
    setLoadingBatches(true);
    try {
      const { data, error } = await supabase
        .from("batches")
        .select(
          `id, batch_number, quantity, remaining_quantity, unit, expiry_date, status, storage_type, entry_date, notes,
           product:product_id ( id, name )`
        )
        .eq("location_id", locationId)
        .order("expiry_date", { ascending: true });

      if (error) throw error;

      setBatches((data || []) as BatchRow[]);
    } catch (error: any) {
      console.error("Error loading batches", error);
      toast({
        title: "Error al cargar el inventario",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingBatches(false);
    }
  };

  const filteredBatches = useMemo(() => {
    if (statusFilter === "all") return batches;
    return batches.filter(batch => batch.status === "ok");
  }, [batches, statusFilter]);

  const productSummary = useMemo(() => {
    const summaryMap = new Map<string, ProductSummary>();

    filteredBatches.forEach((batch) => {
      if (!batch.product) return;

      const existing = summaryMap.get(batch.product.id);
      if (existing) {
        existing.totalQuantity += batch.remaining_quantity;
        // Update next expiry if this batch expires sooner
        if (batch.expiry_date) {
          if (!existing.nextExpiry || new Date(batch.expiry_date) < new Date(existing.nextExpiry)) {
            existing.nextExpiry = batch.expiry_date;
            existing.status = batch.status;
          }
        }
      } else {
        summaryMap.set(batch.product.id, {
          productId: batch.product.id,
          name: batch.product.name,
          totalQuantity: batch.remaining_quantity,
          unit: batch.unit || "uds",
          nextExpiry: batch.expiry_date,
          status: batch.status,
        });
      }
    });

    return Array.from(summaryMap.values());
  }, [filteredBatches]);

  const handleAdjustClick = (batch: BatchRow) => {
    setAdjustBatch(batch);
    setAdjustAmount("0");
    setAdjustDialogOpen(true);
  };

  const handleAdjustSubmit = async () => {
    if (!adjustBatch) return;

    const amount = parseFloat(adjustAmount);
    if (Number.isNaN(amount) || amount < 0) {
      toast({
        title: "Cantidad inválida",
        description: "Introduce una cantidad válida",
        variant: "destructive",
      });
      return;
    }

    const newRemaining = Math.max(0, Number(adjustBatch.remaining_quantity ?? 0) - amount);

    try {
      setAdjusting(true);
      const { error } = await supabase
        .from("batches")
        .update({ remaining_quantity: newRemaining })
        .eq("id", adjustBatch.id);

      if (error) throw error;

      toast({
        title: "Inventario actualizado",
        description: `Se han descontado ${amount} ${adjustBatch.unit || "uds"}`,
      });

      setAdjustDialogOpen(false);
      setAdjustBatch(null);
      if (selectedLocation) {
        await loadBatches(selectedLocation);
      }
    } catch (error: any) {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Inventario</h1>
            <p className="text-muted-foreground">
              Consulta tus lotes y productos registrados en {selectedLocationData?.name || "tu local"}.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button variant="outline" onClick={() => selectedLocation && loadBatches(selectedLocation)} disabled={loadingBatches}>
              <RefreshCw className="mr-2 h-4 w-4" /> Recargar
            </Button>
          </div>
        </div>

        {statusFilter !== "all" && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Filtrado por: En buen estado
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
              Mostrar todo el inventario
            </Button>
          </div>
        )}

        {loading || loadingBatches ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen por producto</CardTitle>
                <CardDescription>Vista agregada del inventario disponible</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredBatches.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <PackageSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {statusFilter === "all" 
                        ? "No hay productos registrados todavía."
                        : "No hay productos en buen estado."
                      }
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad disponible</TableHead>
                        <TableHead>Próxima caducidad</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productSummary.map((summary) => (
                        <TableRow key={summary.productId}>
                          <TableCell className="font-medium">{summary.name}</TableCell>
                          <TableCell>
                            {summary.totalQuantity.toLocaleString("es-ES", { maximumFractionDigits: 2 })}{" "}
                            {summary.unit}
                          </TableCell>
                          <TableCell>{formatDate(summary.nextExpiry)}</TableCell>
                          <TableCell>
                            <Badge className={statusConfig[summary.status].className}>
                              {statusConfig[summary.status].label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalle por lote</CardTitle>
                <CardDescription>Gestiona cada lote registrado</CardDescription>
              </CardHeader>
              <CardContent>
                {batches.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <PackageSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay lotes registrados en este local.</p>
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
                            <div className="text-xs text-muted-foreground">Almacenamiento: {batch.storage_type}</div>
                          </TableCell>
                          <TableCell>{batch.batch_number || "Sin lote"}</TableCell>
                          <TableCell>{formatDate(batch.expiry_date)}</TableCell>
                          <TableCell>
                            {Number(batch.remaining_quantity ?? 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })}{" "}
                            {batch.unit || "uds"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[batch.status].className}>
                              {statusConfig[batch.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleAdjustClick(batch)}>
                              Registrar consumo
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar consumo</DialogTitle>
            <DialogDescription>
              Descarga la cantidad consumida del lote {adjustBatch?.batch_number || "sin referencia"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="adjust-amount">Cantidad a descontar</Label>
              <Input
                id="adjust-amount"
                type="number"
                step="0.01"
                min="0"
                value={adjustAmount}
                onChange={(event) => setAdjustAmount(event.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Disponible actualmente: {adjustBatch?.remaining_quantity ?? 0} {adjustBatch?.unit || "uds"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} disabled={adjusting}>
              Cancelar
            </Button>
            <Button onClick={handleAdjustSubmit} disabled={adjusting}>
              {adjusting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;