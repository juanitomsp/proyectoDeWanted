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
import { AlertTriangle, FileText, Loader2, Package, Signature } from "lucide-react";

interface DeliveryNoteSummary {
  id: string;
  delivery_date: string;
  supplier?: { name: string | null } | null;
  items?: {
    quantity: number;
    unit: string | null;
    product: { name: string | null } | null;
  }[] | null;
}

interface BatchSummary {
  id: string;
  product: { name: string | null } | null;
  batch_number: string | null;
  quantity: number;
  unit: string | null;
  expiry_date: string | null;
  status: "ok" | "warning" | "critical" | "expired";
}

const monthOptions = Array.from({ length: 12 }).map((_, index) => {
  const date = new Date();
  date.setMonth(date.getMonth() - index);
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const label = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return { value, label };
});

const statusLabels: Record<BatchSummary["status"], string> = {
  ok: "En buen estado",
  warning: "Próximo a caducar",
  critical: "Crítico",
  expired: "Caducado",
};

const createSimplePdf = (lines: string[]): Uint8Array => {
  const escapeText = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const sanitizedLines = lines.map((line) => (line && line.trim() ? line : " "));
  const startY = 800;
  const lineHeight = 16;

  const streamLines = sanitizedLines
    .map((line, index) => {
      const y = startY - index * lineHeight;
      return `BT /F1 12 Tf 50 ${y} Td (${escapeText(line)}) Tj ET`;
    })
    .join("\n");

  const streamContent = `${streamLines}\n`;
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(streamContent);

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${streamBytes.length} >> stream\n${streamContent}endstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];

  const header = "%PDF-1.4\n";
  const encoderSegments: Uint8Array[] = [];
  let totalLength = 0;

  const pushSegment = (text: string) => {
    const bytes = encoder.encode(text);
    encoderSegments.push(bytes);
    totalLength += bytes.length;
    return bytes.length;
  };

  pushSegment(header);
  const offsets: number[] = [];

  objects.forEach((object) => {
    offsets.push(totalLength);
    pushSegment(object);
  });

  const xrefPosition = totalLength;
  pushSegment("xref\n");
  pushSegment("0 6\n");
  pushSegment("0000000000 65535 f \n");
  offsets.forEach((offset) => {
    pushSegment(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  });
  pushSegment("trailer << /Size 6 /Root 1 0 R >>\n");
  pushSegment("startxref\n");
  pushSegment(`${xrefPosition}\n`);
  pushSegment("%%EOF");

  const result = new Uint8Array(totalLength);
  let pointer = 0;
  encoderSegments.forEach((segment) => {
    result.set(segment, pointer);
    pointer += segment.length;
  });

  return result;
};

const HaccpReport = () => {
  const routerLocation = useRouterLocation();
  const locationState = routerLocation.state as { locationId?: string } | null;
  const { toast } = useToast();
  const { user, locations, selectedLocation, setSelectedLocation, selectedLocationData } = useLocations(
    locationState?.locationId
  );
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [signatureName, setSignatureName] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryNoteSummary[]>([]);
  const [batches, setBatches] = useState<BatchSummary[]>([]);

  useEffect(() => {
    if (selectedLocation && selectedMonth) {
      loadPreview(selectedLocation, selectedMonth);
    }
  }, [selectedLocation, selectedMonth]);

  const loadPreview = async (locationId: string, month: string) => {
    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    try {
      const { data: deliveryData } = await supabase
        .from("delivery_notes")
        .select(
          `id, delivery_date, supplier:supplier_id ( name ), items:delivery_note_items ( quantity, unit, product:product_id ( name ) )`
        )
        .eq("location_id", locationId)
        .gte("delivery_date", start.toISOString())
        .lt("delivery_date", end.toISOString())
        .order("delivery_date", { ascending: true });

      setDeliveries((deliveryData || []) as DeliveryNoteSummary[]);

      const { data: batchData } = await supabase
        .from("batches")
        .select(`id, product:product_id ( name ), batch_number, quantity, unit, expiry_date, status`)
        .eq("location_id", locationId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());

      setBatches((batchData || []) as BatchSummary[]);
    } catch (error: any) {
      console.error("Error loading preview", error);
      toast({
        title: "No se pudo cargar la vista previa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const alerts = useMemo(() => {
    return batches.reduce(
      (acc, batch) => {
        acc[batch.status] = (acc[batch.status] || 0) + 1;
        return acc;
      },
      { ok: 0, warning: 0, critical: 0, expired: 0 } as Record<BatchSummary["status"], number>
    );
  }, [batches]);

  const handleGenerate = async () => {
    if (!user) return;
    if (!selectedLocation) return;

    try {
      setLoadingReport(true);
      const start = new Date(`${selectedMonth}-01T00:00:00`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const pdfLines: string[] = [];
      pdfLines.push("Informe HACCP");
      pdfLines.push(`Local: ${selectedLocationData?.name || ""}`);
      pdfLines.push(`Periodo: ${new Date(start).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`);
      pdfLines.push("");

      pdfLines.push("Entradas registradas");
      if (deliveries.length === 0) {
        pdfLines.push("- No hay albaranes registrados en este periodo");
      } else {
        deliveries.forEach((delivery) => {
          pdfLines.push(`• ${new Date(delivery.delivery_date).toLocaleDateString("es-ES")} - ${delivery.supplier?.name || "Proveedor sin nombre"}`);
          delivery.items?.forEach((item) => {
            pdfLines.push(`   · ${item.product?.name || "Producto"}: ${item.quantity} ${item.unit || "uds"}`);
          });
        });
      }

      pdfLines.push("");
      pdfLines.push("Lotes generados");
      if (batches.length === 0) {
        pdfLines.push("- No se registraron lotes en este periodo");
      } else {
        batches.forEach((batch) => {
          pdfLines.push(`• ${batch.product?.name || "Producto"} (${batch.batch_number || "Sin lote"})`);
          pdfLines.push(
            `   · Cantidad: ${batch.quantity} ${batch.unit || "uds"} | Caducidad: ${
              batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString("es-ES") : "Sin fecha"
            }`
          );
          pdfLines.push(`   · Estado: ${statusLabels[batch.status]}`);
        });
      }

      pdfLines.push("");
      pdfLines.push("Alertas y acciones correctivas");
      pdfLines.push(`• Alertas críticas: ${alerts.critical}`);
      pdfLines.push(`• Alertas próximas: ${alerts.warning}`);
      pdfLines.push(`• Lotes caducados: ${alerts.expired}`);
      pdfLines.push("");

      if (signatureName.trim()) {
        pdfLines.push("Firma");
        pdfLines.push(`Responsable: ${signatureName.trim()}`);
        pdfLines.push(`Fecha: ${new Date().toLocaleDateString("es-ES")}`);
      }

      const pdfContent = createSimplePdf(pdfLines);
      const blob = new Blob([pdfContent.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `HACCP-${selectedMonth}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      await supabase.from("haccp_reports").insert({
        location_id: selectedLocation,
        report_month: `${selectedMonth}-01`,
        generated_by: user.id,
        signed_by: signatureName.trim() || null,
      });

      toast({
        title: "Informe generado",
        description: "Se descargó el PDF y se registró en tu historial.",
      });
    } catch (error: any) {
      console.error("Error generating report", error);
      toast({
        title: "No se pudo generar el PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Informe HACCP</h1>
            <p className="text-muted-foreground">
              Genera un resumen mensual con las entradas de producto y acciones registradas.
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

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Albaranes
              </CardTitle>
              <CardDescription>Entradas registradas durante el periodo seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{deliveries.length}</p>
              <p className="text-sm text-muted-foreground">Total de albaranes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" /> Lotes
              </CardTitle>
              <CardDescription>Lotes registrados y listos para inventario.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{batches.length}</p>
              <p className="text-sm text-muted-foreground">Total de lotes creados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-status-warning-foreground" /> Alertas
              </CardTitle>
              <CardDescription>Estado de los lotes registrados en el periodo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge className="bg-status-critical-bg text-status-critical">Críticos: {alerts.critical}</Badge>
              <Badge className="bg-status-warning-bg text-status-warning-foreground">Próximos: {alerts.warning}</Badge>
              <Badge className="bg-red-100 text-red-600">Caducados: {alerts.expired}</Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configura tu informe</CardTitle>
            <CardDescription>Selecciona el periodo y añade la firma del responsable.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Input
                value={signatureName}
                onChange={(event) => setSignatureName(event.target.value)}
                placeholder="Nombre del responsable"
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleGenerate} disabled={loadingReport}>
                {loadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Signature className="mr-2 h-4 w-4" />}
                Generar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Resumen previo</CardTitle>
            <CardDescription>Información que se incluirá en el informe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Entradas</h3>
              {deliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay registros en este periodo.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {deliveries.map((delivery) => (
                    <li key={delivery.id} className="border rounded-md p-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{new Date(delivery.delivery_date).toLocaleDateString("es-ES")}</span>
                        <span>{delivery.supplier?.name || "Proveedor sin nombre"}</span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {delivery.items?.map((item, index) => (
                          <li key={index}>
                            {item.product?.name || "Producto"} - {item.quantity} {item.unit || "uds"}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Lotes</h3>
              {batches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No se registraron lotes en este periodo.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {batches.map((batch) => (
                    <li key={batch.id} className="border rounded-md p-3">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{batch.product?.name || "Producto"}</span>
                        <span>Estado: {statusLabels[batch.status]}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Cantidad: {batch.quantity} {batch.unit || "uds"} | Caducidad: {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString("es-ES") : "Sin fecha"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HaccpReport;