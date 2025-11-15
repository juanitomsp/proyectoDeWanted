import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, MapPin } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Business data
  const [businessName, setBusinessName] = useState("");
  const [legalName, setLegalName] = useState("");
  
  // First location data
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<string>("restaurant");
  const [address, setAddress] = useState("");

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Create business
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .insert({
          owner_id: user.id,
          name: businessName,
          legal_name: legalName || businessName,
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // Create subscription
      await supabase.from("subscriptions").insert({
        business_id: business.id,
        status: "trial",
        active_locations_count: 1,
      });

      setStep(2);
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

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Get business
      const { data: business } = await supabase
        .from("businesses")
        .select()
        .eq("owner_id", user.id)
        .single();

      if (!business) throw new Error("Business not found");

      // Create location
      const { error: locationError } = await supabase.from("locations").insert([{
        business_id: business.id,
        name: locationName,
        location_type: locationType as "restaurant" | "bar" | "cafe" | "catering" | "store" | "other",
        address: address,
      }]);

      if (locationError) throw locationError;

      toast({
        title: "¡Todo listo!",
        description: "Tu negocio y primer local han sido creados.",
      });

      navigate("/dashboard");
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

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            {step === 1 ? <Building2 className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
            <span className="text-sm font-medium">Paso {step} de 2</span>
          </div>
          <CardTitle className="text-2xl">
            {step === 1 ? "Crea tu Negocio" : "Configura tu Primer Local"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Información básica de tu empresa"
              : "Añade tu primer establecimiento"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">Nombre del Negocio *</Label>
                <Input
                  id="business-name"
                  placeholder="Restaurante El Buen Sabor"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal-name">Razón Social</Label>
                <Input
                  id="legal-name"
                  placeholder="El Buen Sabor S.L."
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Opcional para el MVP</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCreateLocation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Nombre del Local *</Label>
                <Input
                  id="location-name"
                  placeholder="Local Centro"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-type">Tipo de Establecimiento *</Label>
                <Select value={locationType} onValueChange={setLocationType}>
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
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  placeholder="Calle Principal 123"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="w-full"
                >
                  Atrás
                </Button>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Finalizar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
