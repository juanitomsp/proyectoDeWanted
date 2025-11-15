import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, CheckCircle, TrendingUp, Shield, BarChart3, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Hero Section */}
      <header className="container mx-auto px-4 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-8">
            <Package className="h-5 w-5" />
            <span className="font-semibold">LotTrack</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Controla tu Inventario y Caducidades
            <br />
            <span className="text-white/90">con Inteligencia</span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-white/80 max-w-2xl mx-auto">
            Gestión completa de entradas, lotes, HACCP y redistribución interna 
            para restaurantes y negocios del sector alimentario
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              Comenzar Gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              Ver Demo
            </Button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="bg-background py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que Necesitas</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Diseñado específicamente para el sector alimentario
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-lg border shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Registro Rápido</h3>
              <p className="text-muted-foreground">
                Escanea albaranes y códigos GS1. Crea lotes automáticamente con foto del envase.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border shadow-sm">
              <div className="bg-status-warning/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-status-warning-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Alertas Inteligentes</h3>
              <p className="text-muted-foreground">
                Notificaciones a 7, 3 y 1 día de caducidad. Evita desperdicios.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border shadow-sm">
              <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Marketplace Interno</h3>
              <p className="text-muted-foreground">
                Redistribuye productos entre tus locales. Reduce pérdidas.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border shadow-sm">
              <div className="bg-status-ok/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-status-ok" />
              </div>
              <h3 className="text-xl font-semibold mb-3">HACCP Automático</h3>
              <p className="text-muted-foreground">
                Genera PDFs mensuales con todos los registros y trazabilidad.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border shadow-sm">
              <div className="bg-secondary/50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Multi-Local</h3>
              <p className="text-muted-foreground">
                Gestiona todos tus establecimientos desde una única cuenta.
              </p>
            </div>

            <div className="bg-card p-8 rounded-lg border shadow-sm">
              <div className="bg-muted w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Equipo Colaborativo</h3>
              <p className="text-muted-foreground">
                Invita empleados de cada local con permisos específicos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Precios Transparentes</h2>
            <p className="text-xl text-muted-foreground">
              Paga solo por lo que usas, con descuentos por volumen
            </p>
          </div>
          
          <div className="max-w-md mx-auto bg-card p-8 rounded-lg border shadow-lg">
            <div className="text-center mb-6">
              <p className="text-4xl font-bold mb-2">30€<span className="text-xl text-muted-foreground">/mes</span></p>
              <p className="text-muted-foreground">por local</p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-status-ok mt-0.5" />
                <span>OCR de albaranes y códigos GS1</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-status-ok mt-0.5" />
                <span>Gestión de lotes y caducidades</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-status-ok mt-0.5" />
                <span>Alertas automáticas</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-status-ok mt-0.5" />
                <span>PDF HACCP mensual</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-status-ok mt-0.5" />
                <span>Marketplace interno ilimitado</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-status-ok mt-0.5" />
                <span>Hasta 10 empleados por local</span>
              </li>
            </ul>
            <p className="text-sm text-center text-muted-foreground mb-6">
              🎁 Descuentos desde 5 locales (20-25€/local)
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full" size="lg">
              Comenzar Prueba Gratis
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Comienza a Optimizar tu Inventario Hoy
          </h2>
          <p className="text-xl mb-10 text-white/90 max-w-2xl mx-auto">
            Únete a restaurantes y negocios que ya confían en LotTrack
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-primary hover:bg-white/90"
          >
            Registrarse Gratis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 LotTrack. Gestión profesional de inventario para el sector alimentario.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
