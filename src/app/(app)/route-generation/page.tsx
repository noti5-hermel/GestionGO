
'use client'

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Map, List } from "lucide-react"

/**
 * @file route-generation/page.tsx
 * @description Página para generar una ruta visual basada en la selección de clientes con geocercas.
 */

// Tipo de dato para un cliente con geocerca.
type CustomerWithGeofence = {
  code_customer: string;
  customer_name: string;
  geocerca: string;
}

/**
 * Componente principal de la página de Generación de Ruta.
 */
export default function RouteGenerationPage() {
  const [customers, setCustomers] = useState<CustomerWithGeofence[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, boolean>>({});
  const [generatedRoute, setGeneratedRoute] = useState<CustomerWithGeofence[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  /**
   * Obtiene la lista de clientes que tienen una geocerca definida.
   */
  const fetchCustomersWithGeofence = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer')
      .select('code_customer, customer_name, geocerca')
      .not('geocerca', 'is', null);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes con geocercas.",
        variant: "destructive",
      });
    } else {
      setCustomers(data as CustomerWithGeofence[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchCustomersWithGeofence();
  }, [fetchCustomersWithGeofence]);

  /**
   * Maneja el cambio de estado de un checkbox de cliente.
   */
  const handleCustomerSelect = (customerId: string, checked: boolean) => {
    setSelectedCustomers(prev => ({
      ...prev,
      [customerId]: checked,
    }));
  };

  /**
   * Filtra y establece los clientes seleccionados para generar la ruta.
   */
  const handleGenerateRoute = () => {
    const selected = customers.filter(customer => selectedCustomers[customer.code_customer]);
    if (selected.length === 0) {
        toast({
            title: "Sin selección",
            description: "Por favor, seleccione al menos un cliente para generar la ruta.",
            variant: "destructive"
        });
        return;
    }
    setGeneratedRoute(selected);
  };
  
  const handleSelectAll = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {};
    if (checked) {
        customers.forEach(customer => newSelection[customer.code_customer] = true);
    }
    setSelectedCustomers(newSelection);
  }

  const allSelected = customers.length > 0 && customers.every(c => selectedCustomers[c.code_customer]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Columna de Selección de Clientes */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader>
          <CardTitle>Selección de Clientes</CardTitle>
          <CardDescription>Marque los clientes con geocerca para incluirlos en la ruta.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
           <div className="flex items-center space-x-2 border p-2 rounded-md">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={(checked) => handleSelectAll(!!checked)}
            />
            <Label htmlFor="select-all" className="font-bold">
              Seleccionar Todos
            </Label>
          </div>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {loading ? (
                <p>Cargando clientes...</p>
              ) : customers.length > 0 ? (
                customers.map(customer => (
                  <div key={customer.code_customer} className="flex items-center space-x-2">
                    <Checkbox
                      id={customer.code_customer}
                      checked={selectedCustomers[customer.code_customer] || false}
                      onCheckedChange={(checked) => handleCustomerSelect(customer.code_customer, !!checked)}
                    />
                    <Label htmlFor={customer.code_customer} className="w-full">
                      {customer.customer_name} ({customer.code_customer})
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No hay clientes con geocercas definidas.</p>
              )}
            </div>
          </ScrollArea>
           <Button onClick={handleGenerateRoute} className="mt-4">
            <Map className="mr-2 h-4 w-4" />
            Generar Ruta
          </Button>
        </CardContent>
      </Card>

      {/* Columna del Mapa y Ruta Generada */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle>Ruta Generada</CardTitle>
          <CardDescription>Visualización de la ruta basada en los clientes seleccionados.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center gap-4">
          {generatedRoute.length > 0 ? (
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Lista de clientes en la ruta */}
              <div className="md:col-span-1 bg-muted p-4 rounded-lg h-full">
                <h3 className="font-semibold text-lg mb-4 flex items-center"><List className="mr-2 h-5 w-5"/> Puntos de Entrega</h3>
                <ScrollArea className="h-[calc(100%-40px)]">
                    <ol className="list-decimal list-inside space-y-2">
                    {generatedRoute.map(customer => (
                        <li key={customer.code_customer}>{customer.customer_name}</li>
                    ))}
                    </ol>
                </ScrollArea>
              </div>
              {/* Placeholder del mapa */}
              <div className="md:col-span-2 relative w-full h-full min-h-[300px] bg-gray-200 rounded-lg overflow-hidden">
                <Image
                  src="https://picsum.photos/seed/route-map/1200/800"
                  alt="Mapa de la ruta generada"
                  layout="fill"
                  objectFit="cover"
                  className="opacity-70"
                  data-ai-hint="route map"
                />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-2xl font-bold text-background bg-black/50 p-4 rounded-md">Visualización de Mapa (Placeholder)</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>Seleccione clientes y presione "Generar Ruta" para visualizar el recorrido.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
