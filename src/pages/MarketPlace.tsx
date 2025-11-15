import { useEffect, useMemo, useState } from "react";
import { useLocation as useRouterLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocations } from "@/hooks/use-locations";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, ArrowRightLeft, Loader2, Package, Send, Share, Truck } from "lucide-react";

interface BatchOption {
  id: string;
  batch_number: string | null;
  remaining_quantity: number;
  unit: string | null;
  expiry_date: string | null;
  product: {
    id: string;
    name: string;
  } | null;
}

interface TransferRow {
  id: string;
  from_location_id: string;
  to_location_id: string;
  batch_id: string;
  product_id: string;
  quantity: number;
  status: "pending" | "accepted" | "rejected" | "completed";
  notes: string | null;
  requested_at: string;
  processed_at: string | null;
  completed_at: string | null;
  batch?: BatchOption & { status: string };
}

const statusConfig: Record<TransferRow["status"], { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
  accepted: { label: "Aceptado", className: "bg-status-ok/10 text-status-ok" },
  rejected: { label: "Rechazado", className: "bg-red-100 text-red-600" },
  completed: { label: "Completado", className: "bg-secondary text-secondary-foreground" },
};

const Marketplace = () => {
  const routerLocation = useRouterLocation();
  const locationState = routerLocation.state as { locationId?: string } | null;
  const { toast } = useToast();
  const { user, locations, selectedLocation, setSelectedLocation } = useLocations(locationState?.locationId);
  const [batchesByLocation, setBatchesByLocation] = useState<Record<string, BatchOption[]>>({});
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [publishBatchId, setPublishBatchId] = useState<string>("");
  const [publishQuantity, setPublishQuantity] = useState("0");
  const [publishDestination, setPublishDestination] = useState<string>("");
  const [publishNote, setPublishNote] = useState("");
  const [requestFromLocation, setRequestFromLocation] = useState<string>("");
  const [requestBatchId, setRequestBatchId] = useState<string>("");
  const [requestQuantity, setRequestQuantity] = useState("0");
  const [requestNote, setRequestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedLocation) {
      loadBatchesForLocation(selectedLocation);
    }
  }, [selectedLocation]);

  useEffect(() => {
    loadTransfers();
  }, [selectedLocation]);

  const loadBatchesForLocation = async (locationId: string) => {
    setLoadingBatches(true);
    try {
      const { data, error } = await supabase
        .from("batches")
        .select(
          `id, batch_number, remaining_quantity, unit, expiry_date,
           product:product_id ( id, name )`
        )
        .eq("location_id", locationId)
        .gt("remaining_quantity", 0)
        .order("expiry_date", { ascending: true, nullsFirst: true });

      if (error) throw error;

      setBatchesByLocation((prev) => ({ ...prev, [locationId]: (data || []) as BatchOption[] }));
    } catch (error: any) {
      console.error("Error loading batches", error);
      toast({
        title: "No se pudo cargar el inventario",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const { data, error } = await supabase
        .from("internal_transfers")
        .select(
          `id, from_location_id, to_location_id, batch_id, product_id, quantity, status, notes, requested_at, processed_at, completed_at,
           batch:batch_id ( id, batch_number, remaining_quantity, unit, expiry_date, product:product_id ( id, name ), status )`
        )
        .order("requested_at", { ascending: false });

      if (error) throw error;

      setTransfers((data || []) as TransferRow[]);
    } catch (error: any) {
      console.error("Error loading transfers", error);
      toast({
        title: "No se pudieron cargar las transferencias",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingTransfers(false);
    }
  };

  const canManageTransfer = useMemo(() => {
    return new Set(locations.map((location) => location.id));
  }, [locations]);

  const getLocationName = (locationId: string) => {
    return locations.find((location) => location.id === locationId)?.name || "Sin nombre";
  };

  const handlePublish = async () => {
    if (!user) return;
    if (!selectedLocation) return;
    const quantity = Number(publishQuantity);
    if (!publishBatchId || !publishDestination || Number.isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona lote, destino y cantidad válida",
        variant: "destructive",
      });
      return;
    }

    const batch = batchesByLocation[selectedLocation]?.find((item) => item.id === publishBatchId);
    if (!batch || !batch.product) {
      toast({
        title: "Lote no disponible",
        description: "Recarga el inventario y vuelve a intentarlo",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from("internal_transfers").insert({
        from_location_id: selectedLocation,
        to_location_id: publishDestination,
        batch_id: batch.id,
        product_id: batch.product.id,
        quantity,
        requested_by: user.id,
        notes: publishNote || null,
      });

      if (error) throw error;

      toast({
        title: "Excedente publicado",
        description: "El otro local recibirá la solicitud para aceptarlo.",
      });

      setPublishBatchId("");
      setPublishQuantity("0");
      setPublishDestination("");
      setPublishNote("");
      await loadTransfers();
      await loadBatchesForLocation(selectedLocation);
    } catch (error: any) {
      toast({
        title: "No se pudo publicar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequest = async () => {
    if (!user) return;
    if (!selectedLocation) return;
    const quantity = Number(requestQuantity);
    if (!requestFromLocation || !requestBatchId || Number.isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona origen, lote y cantidad válida",
        variant: "destructive",
      });
      return;
    }

    const batch = batchesByLocation[requestFromLocation]?.find((item) => item.id === requestBatchId);
    if (!batch || !batch.product) {
      toast({
        title: "Lote no disponible",
        description: "Recarga la información y vuelve a intentarlo",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from("internal_transfers").insert({
        from_location_id: requestFromLocation,
        to_location_id: selectedLocation,
        batch_id: batch.id,
        product_id: batch.product.id,
        quantity,
        requested_by: user.id,
        notes: requestNote || null,
      });

      if (error) throw error;

      toast({
        title: "Solicitud enviada",
        description: "El local origen revisará la petición",
      });

      setRequestBatchId("");
      setRequestFromLocation("");
      setRequestQuantity("0");
      setRequestNote("");
      await loadTransfers();
    } catch (error: any) {
      toast({
        title: "No se pudo enviar la solicitud",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadRequestLocation = async (locationId: string) => {
    setRequestFromLocation(locationId);
    if (!batchesByLocation[locationId]) {
      await loadBatchesForLocation(locationId);
    }
  };

  const updateTransferStatus = async (transfer: TransferRow, status: TransferRow["status"]) => {
    if (!user) return;

    try {
      setSubmitting(true);
      const updates: Record<string, any> = {
        status,
      };

      if (status === "accepted" || status === "rejected") {
        updates.processed_by = user.id;
        updates.processed_at = new Date().toISOString();
      }

      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("internal_transfers")
        .update(updates)
        .eq("id", transfer.id);

      if (error) throw error;

      if (status === "completed" && transfer.batch) {
        const newRemaining = Math.max(0, Number(transfer.batch.remaining_quantity ?? 0) - Number(transfer.quantity));
        await supabase.from("batches").update({ remaining_quantity: newRemaining }).eq("id", transfer.batch.id);
        await loadBatchesForLocation(transfer.from_location_id);
      }

      toast({
        title: "Transferencia actualizada",
        description: `Estado: ${statusConfig[status].label}`,
      });

      await loadTransfers();
    } catch (error: any) {
      toast({
        title: "No se pudo actualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isManagerOf = (locationId: string) => canManageTransfer.has(locationId);

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Marketplace interno</h1>
            <p className="text-muted-foreground">
              Comparte excedentes entre locales y responde a solicitudes pendientes.
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

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share className="h-5 w-5 text-primary" /> Publicar excedente
              </CardTitle>
              <CardDescription>Selecciona un lote de tu local y ofrece parte del stock a otro local.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Lote disponible</Label>
                <Select
                  value={publishBatchId}
                  onValueChange={setPublishBatchId}
                  disabled={loadingBatches || !selectedLocation}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {(batchesByLocation[selectedLocation || ""] || []).map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.product?.name || "Sin nombre"} • {batch.remaining_quantity} {batch.unit || "uds"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad a ofrecer</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={publishQuantity}
                  onChange={(event) => setPublishQuantity(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Local destino</Label>
                <Select value={publishDestination} onValueChange={setPublishDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations
                      .filter((location) => location.id !== selectedLocation)
                      .map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nota opcional</Label>
                <Input value={publishNote} onChange={(event) => setPublishNote(event.target.value)} placeholder="Motivo" />
              </div>
              <Button onClick={handlePublish} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Publicar excedente
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Solicitar producto
              </CardTitle>
              <CardDescription>Elige un lote de otro local y solicita una transferencia a tu establecimiento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Local origen</Label>
                <Select value={requestFromLocation} onValueChange={handleLoadRequestLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations
                      .filter((location) => location.id !== selectedLocation)
                      .map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lote disponible</Label>
                <Select
                  value={requestBatchId}
                  onValueChange={setRequestBatchId}
                  disabled={!requestFromLocation || loadingBatches}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {(batchesByLocation[requestFromLocation] || []).map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.product?.name || "Sin nombre"} • {batch.remaining_quantity} {batch.unit || "uds"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cantidad solicitada</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={requestQuantity}
                  onChange={(event) => setRequestQuantity(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nota opcional</Label>
                <Input value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="Motivo" />
              </div>
              <Button onClick={handleRequest} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                Enviar solicitud
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de transferencias</CardTitle>
            <CardDescription>Gestiona solicitudes pendientes o revisa estados anteriores.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTransfers ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : transfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mb-4 opacity-50" />
                <p>No hay transferencias registradas todavía.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Actualizado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div className="font-medium">{transfer.batch?.product?.name || "Sin nombre"}</div>
                        <p className="text-xs text-muted-foreground">
                          Lote: {transfer.batch?.batch_number || "-"}
                        </p>
                      </TableCell>
                      <TableCell>{getLocationName(transfer.from_location_id)}</TableCell>
                      <TableCell>{getLocationName(transfer.to_location_id)}</TableCell>
                      <TableCell>
                        {transfer.quantity} {transfer.batch?.unit || "uds"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[transfer.status].className}>
                          {statusConfig[transfer.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(transfer.requested_at).toLocaleString("es-ES")}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {transfer.status === "pending" && isManagerOf(transfer.from_location_id) && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateTransferStatus(transfer, "accepted")}
                              disabled={submitting}
                            >
                              Aceptar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updateTransferStatus(transfer, "rejected")}
                              disabled={submitting}
                            >
                              Rechazar
                            </Button>
                          </>
                        )}
                        {transfer.status === "accepted" && isManagerOf(transfer.from_location_id) && (
                          <Button size="sm" onClick={() => updateTransferStatus(transfer, "completed")}
                            disabled={submitting}
                          >
                            Completar
                          </Button>
                        )}
                        {transfer.notes && (
                          <p className="text-xs text-muted-foreground mt-2">Nota: {transfer.notes}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" /> Consejos de uso
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • El local origen debe aceptar la solicitud para que se descuente automáticamente del inventario.
            </p>
            <p>
              • Marca como completada la transferencia una vez realizada la entrega física entre locales.
            </p>
            <p>
              • El receptor debe registrar manualmente la entrada en su inventario tras la entrega.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Marketplace;