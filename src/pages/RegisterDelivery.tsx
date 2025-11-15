import { useEffect, useMemo, useState } from "react";
import { useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocations } from "@/hooks/use-locations";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2, Plus, Scan } from "lucide-react";

interface SupplierOption {
  id: string;
  name: string;
}

interface ProductLine {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  gtin?: string;
  batchNumber?: string;
  expiryDate?: string;
  storageType: "refrigerated" | "frozen" | "dry" | "ambient";
  notes?: string;
}

const storageOptions = [
  { value: "refrigerated", label: "Refrigerado" },
  { value: "frozen", label: "Congelado" },
  { value: "dry", label: "Seco" },
  { value: "ambient", label: "Ambiente" },
];

const unitOptions = ["uds", "kg", "L", "cajas"];

const RegisterDelivery = () => {
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  const locationState = routerLocation.state as { locationId?: string } | null;
  const { toast } = useToast();
  const { user, locations, selectedLocation, setSelectedLocation, selectedLocationData } = useLocations(
    locationState?.locationId
  );
  const [step, setStep] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [products, setProducts] = useState<ProductLine[]>([
    {
      id: crypto.randomUUID(),
      name: "",
      quantity: 1,
      unit: "uds",
      storageType: "refrigerated",
    },
  ]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null)[0];

  useEffect(() => {
    if (!selectedLocationData?.business_id) return;
    loadSuppliers(selectedLocationData.business_id);
  }, [selectedLocationData?.business_id]);

  

  const loadSuppliers = async (businessId: string) => {
    setLoadingSuppliers(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("business_id", businessId)
        .order("name", { ascending: true });

      if (error) throw error;

      setSuppliers(data as SupplierOption[]);
    } catch (error: any) {
      toast({
        title: "No se pudieron cargar los proveedores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const addProductLine = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        quantity: 1,
        unit: "uds",
        storageType: "refrigerated",
      },
    ]);
  };

  const removeProductLine = (id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const updateProductLine = <K extends keyof ProductLine>(id: string, key: K, value: ProductLine[K]) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id
          ? {
              ...product,
              [key]: value,
            }
          : product
      )
    );
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await processImage(file);
      }
    };
    input.click();
  };

  const processImage = async (file: File) => {
    try {
      setProcessingOCR(true);
      
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve) => {
        reader.onloadend = async () => {
          const base64Image = reader.result as string;
          
          // Call OCR edge function
          const { data, error } = await supabase.functions.invoke('ocr-albaran', {
            body: { image: base64Image }
          });

          if (error) throw error;

          // Process OCR results
          if (data.supplier) {
            setNewSupplierName(data.supplier);
          }

          if (data.date) {
            setDeliveryDate(data.date);
          }

          if (data.products && Array.isArray(data.products)) {
            const detectedProducts = data.products.map((p: any) => ({
              id: crypto.randomUUID(),
              name: p.name || "",
              quantity: p.quantity || 1,
              unit: p.unit || "uds",
              storageType: "refrigerated" as const,
            }));
            setProducts(detectedProducts);
          }

          toast({
            title: "OCR completado",
            description: `Se detectaron ${data.products?.length || 0} productos. Revisa y ajusta la información.`,
          });

          resolve(null);
        };
      });
    } catch (error: any) {
      console.error('Error processing OCR:', error);
      toast({
        title: "Error en OCR",
        description: error.message || "No se pudo procesar la imagen",
        variant: "destructive",
      });
    } finally {
      setProcessingOCR(false);
    }
  };

  const simulateOCR = () => {
    const simulated = [
      {
        id: crypto.randomUUID(),
        name: "Pechuga de pollo",
        quantity: 10,
        unit: "kg",
        storageType: "refrigerated" as const,
        batchNumber: "POL-2025-01",
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
      {
        id: crypto.randomUUID(),
        name: "Lechuga iceberg",
        quantity: 20,
        unit: "uds",
        storageType: "dry" as const,
        batchNumber: "VEG-001",
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    ];

    setProducts(simulated);
    toast({
      title: "OCR simulado",
      description: "Hemos cargado productos de ejemplo para que puedas editarlos.",
    });
  };

  const canContinueStep1 = useMemo(() => {
    if (!deliveryDate) return false;
    if (!products.length) return false;
    return products.every((product) => product.name.trim() && product.quantity > 0);
  }, [deliveryDate, products]);

  const goNext = () => {
    if (step === 1 && !canContinueStep1) {
      toast({
        title: "Completa los datos",
        description: "Añade productos y revisa las cantidades detectadas",
        variant: "destructive",
      });
      return;
    }

    setStep((prev) => Math.min(prev + 1, 3));
  };

  const goBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!selectedLocation) return;

    try {
      setSaving(true);

      const businessId = selectedLocationData?.business_id;
      if (!businessId) {
        throw new Error("No se pudo identificar el negocio asociado al local seleccionado");
      }

      let supplierToUse = supplierId;
      if (!supplierToUse && newSupplierName.trim()) {
        const { data: supplier, error: supplierError } = await supabase
          .from("suppliers")
          .insert({
            business_id: businessId,
            name: newSupplierName.trim(),
          })
          .select()
          .single();

        if (supplierError) throw supplierError;
        supplierToUse = supplier.id;
      }

      const { data: deliveryNote, error: deliveryNoteError } = await supabase
        .from("delivery_notes")
        .insert({
          location_id: selectedLocation,
          supplier_id: supplierToUse,
          delivery_date: deliveryDate,
          processed_by: user.id,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (deliveryNoteError) throw deliveryNoteError;

      const uniqueNames = Array.from(new Set(products.map((product) => product.name.trim())));
      let existingProducts: { id: string; name: string }[] | null = null;
      if (uniqueNames.length > 0) {
        const { data } = await supabase
          .from("products")
          .select("id, name")
          .eq("business_id", businessId)
          .in("name", uniqueNames);
        existingProducts = data as { id: string; name: string }[] | null;
      }

      const productMap = new Map<string, string>();
      existingProducts?.forEach((product) => {
        productMap.set(product.name.toLowerCase(), product.id);
      });

      for (const product of products) {
        const key = product.name.trim().toLowerCase();
        if (!productMap.has(key)) {
          const { data: newProduct, error: newProductError } = await supabase
            .from("products")
            .insert({
              business_id: businessId,
              name: product.name.trim(),
              gtin: product.gtin || null,
              default_storage_type: product.storageType,
            })
            .select()
            .single();

          if (newProductError) throw newProductError;
          productMap.set(key, newProduct.id);
        }
      }

      for (const product of products) {
        const key = product.name.trim().toLowerCase();
        const productId = productMap.get(key);
        if (!productId) continue;

        const { data: deliveryItem, error: deliveryItemError } = await supabase
          .from("delivery_note_items")
          .insert({
            delivery_note_id: deliveryNote.id,
            product_id: productId,
            quantity: product.quantity,
            unit: product.unit,
            notes: product.notes || null,
          })
          .select()
          .single();

        if (deliveryItemError) throw deliveryItemError;

        const { error: batchError } = await supabase.from("batches").insert({
          location_id: selectedLocation,
          product_id: productId,
          delivery_note_item_id: deliveryItem.id,
          batch_number: product.batchNumber || null,
          quantity: product.quantity,
          remaining_quantity: product.quantity,
          unit: product.unit,
          expiry_date: product.expiryDate || null,
          storage_type: product.storageType,
          notes: product.notes || null,
          created_by: user.id,
        });

        if (batchError) throw batchError;
      }

      toast({
        title: "Albarán registrado",
        description: "Los lotes se han añadido al inventario",
      });

      navigate("/inventory", { state: { locationId: selectedLocation } });
    } catch (error: any) {
      console.error("Error saving delivery", error);
      toast({
        title: "No se pudo guardar el albarán",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Registrar albarán</h1>
            <p className="text-muted-foreground">
              Procesa nuevas entradas y crea lotes listos para inventario.
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

        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-2">Paso {step} de 3</Badge>
                  {step === 1 && "Foto y detección"}
                  {step === 2 && "Datos de lotes"}
                  {step === 3 && "Resumen"}
                </CardTitle>
                <CardDescription>
                  {step === 1 && "Sube la información del albarán y revisa los productos detectados."}
                  {step === 2 && "Completa la información de cada lote con fechas y ubicaciones."}
                  {step === 3 && "Confirma los datos antes de guardar en el inventario."}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {step > 1 && (
                  <Button variant="outline" onClick={goBack}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
                  </Button>
                )}
                {step < 3 && (
                  <Button onClick={goNext}>
                    Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {step === 1 && (
                <div className="grid gap-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="delivery-date">Fecha de recepción</Label>
                      <Input
                        id="delivery-date"
                        type="date"
                        value={deliveryDate}
                        onChange={(event) => setDeliveryDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Proveedor</Label>
                      <Select value={supplierId ?? undefined} onValueChange={(value) => setSupplierId(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingSuppliers ? "Cargando..." : "Selecciona proveedor"} />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Nuevo proveedor"
                        value={newSupplierName}
                        onChange={(event) => setNewSupplierName(event.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-dashed p-6 bg-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">Captura del albarán</h3>
                        <p className="text-sm text-muted-foreground">
                          Toma una foto del albarán para extraer automáticamente los productos.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          onClick={handleCameraCapture}
                          disabled={processingOCR}
                        >
                          {processingOCR ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <Scan className="mr-2 h-4 w-4" /> Tomar Foto
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={simulateOCR} disabled={processingOCR}>
                          <Scan className="mr-2 h-4 w-4" /> Simular
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {products.map((product) => (
                        <div key={product.id} className="grid gap-4 md:grid-cols-4 md:items-end">
                          <div className="md:col-span-2 space-y-2">
                            <Label>Producto</Label>
                            <Input
                              value={product.name}
                              onChange={(event) => updateProductLine(product.id, "name", event.target.value)}
                              placeholder="Nombre del producto"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cantidad</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.quantity}
                              onChange={(event) => updateProductLine(product.id, "quantity", Number(event.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unidad</Label>
                            <Select value={product.unit} onValueChange={(value) => updateProductLine(product.id, "unit", value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOptions.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-4 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => removeProductLine(product.id)}>
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addProductLine}>
                        <Plus className="mr-2 h-4 w-4" /> Añadir producto
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {products.map((product) => (
                    <Card key={product.id} className="border-muted">
                      <CardHeader>
                        <CardTitle className="text-lg">{product.name || "Producto sin nombre"}</CardTitle>
                        <CardDescription>
                          Cantidad: {product.quantity} {product.unit}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Código GTIN</Label>
                          <Input
                            value={product.gtin || ""}
                            onChange={(event) => updateProductLine(product.id, "gtin", event.target.value)}
                            placeholder="Escanea o introduce el GTIN"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Número de lote</Label>
                          <Input
                            value={product.batchNumber || ""}
                            onChange={(event) => updateProductLine(product.id, "batchNumber", event.target.value)}
                            placeholder="Ej. LOTE-123"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fecha de caducidad</Label>
                          <Input
                            type="date"
                            value={product.expiryDate || ""}
                            onChange={(event) => updateProductLine(product.id, "expiryDate", event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ubicación</Label>
                          <Select
                            value={product.storageType}
                            onValueChange={(value) => updateProductLine(product.id, "storageType", value as ProductLine["storageType"])}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {storageOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label>Notas</Label>
                          <Textarea
                            value={product.notes || ""}
                            onChange={(event) => updateProductLine(product.id, "notes", event.target.value)}
                            placeholder="Incidencias o aclaraciones"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha de recepción</Label>
                      <p className="font-medium">{new Date(deliveryDate).toLocaleDateString("es-ES")}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Proveedor</Label>
                      <p className="font-medium">
                        {suppliers.find((supplier) => supplier.id === supplierId)?.name || newSupplierName || "Sin proveedor"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Lotes a guardar</Label>
                    <div className="space-y-3">
                      {products.map((product) => (
                        <div key={product.id} className="rounded-lg border p-4 bg-white">
                          <div className="flex flex-wrap items-center gap-2 justify-between">
                            <div>
                              <p className="font-semibold">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.quantity} {product.unit} • {product.storageType}
                              </p>
                            </div>
                            <div className="text-right text-sm">
                              <p>Caducidad: {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString("es-ES") : "Sin fecha"}</p>
                              <p>Lote: {product.batchNumber || "Pendiente"}</p>
                            </div>
                          </div>
                          {product.notes && <p className="text-sm mt-2 text-muted-foreground">Notas: {product.notes}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>Notas generales</Label>
                      <Textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Observaciones del albarán"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      Recuerda validar manualmente la información antes de guardar.
                    </div>
                    <Button className="w-full md:w-auto" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Guardar y crear lotes
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterDelivery;