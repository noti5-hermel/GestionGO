'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox" // Importar Checkbox
import { PlusCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const shipmentSchema = z.object({
  id_despacho: z.string().min(1, "ID de despacho es requerido."),
  id_ruta: z.string().min(1, "ID de ruta es requerido."),
  id_motorista: z.string().min(1, "ID de motorista es requerido."),
  id_auxiliar: z.string().min(1, "ID de auxiliar es requerido."),
  total_contado: z.coerce.number().min(0),
  total_credito: z.coerce.number().min(0),
  total_general: z.coerce.number().min(0),
  fecha_despacho: z.string().min(1, "La fecha es requerida."),
  bodega: z.boolean().default(false),
  reparto: z.boolean().default(false),
  facturacion: z.boolean().default(false),
  asist_admon: z.boolean().default(false),
  cobros: z.boolean().default(false),
  gerente_admon: z.boolean().default(false),
})

type Shipment = z.infer<typeof shipmentSchema>

const initialShipments: Shipment[] = [
  {
    id_despacho: "DS-001",
    id_ruta: "Ruta-Norte",
    id_motorista: "MOT-01",
    id_auxiliar: "AUX-01",
    total_contado: 500,
    total_credito: 200,
    total_general: 700,
    fecha_despacho: "2024-07-29",
    bodega: true,
    reparto: true,
    facturacion: false,
    asist_admon: false,
    cobros: false,
    gerente_admon: false,
  },
  {
    id_despacho: "DS-002",
    id_ruta: "Ruta-Sur",
    id_motorista: "MOT-02",
    id_auxiliar: "AUX-02",
    total_contado: 100,
    total_credito: 800,
    total_general: 900,
    fecha_despacho: "2024-07-28",
    bodega: true,
    reparto: true,
    facturacion: true,
    asist_admon: true,
    cobros: false,
    gerente_admon: false,
  },
]

const StatusBadge = ({ checked }: { checked: boolean }) => {
  return <Badge variant={checked ? "default" : "outline"}>{checked ? "OK" : "Pend."}</Badge>
}

export default function ShipmentsPage() { // Cambiado a ShipmentsPage
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<Shipment>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      id_despacho: "",
      id_ruta: "",
      id_motorista: "",
      id_auxiliar: "",
      total_contado: 0,
      total_credito: 0,
      total_general: 0,
      fecha_despacho: new Date().toISOString().split('T')[0],
      bodega: false,
      reparto: false,
      facturacion: false,
      asist_admon: false,
      cobros: false,
      gerente_admon: false,
    },
  })

  const onSubmit = (values: Shipment) => {
    setShipments([...shipments, values])
    form.reset()
    setIsDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Despachos</CardTitle>
            <CardDescription>Gestione la información de sus envíos y estados.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Despacho
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Despacho</DialogTitle>
                <DialogDescription>
                  Complete todos los campos para registrar un nuevo despacho.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="id_despacho"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Despacho</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: DS-003" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="id_ruta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Ruta</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Ruta-Central" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="id_motorista"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Motorista</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: MOT-03" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="id_auxiliar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Auxiliar</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: AUX-03" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_contado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Contado</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_credito"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Crédito</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_general"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total General</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fecha_despacho"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha Despacho</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Card>
                    <CardHeader><CardTitle>Estados</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Campo: Bodega (Checkbox) */}
                      <FormField
                        control={form.control}
                        name="bodega"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Bodega</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Campo: Reparto (Checkbox) */}
                      <FormField
                        control={form.control}
                        name="reparto"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Reparto</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Campo: Facturación (Checkbox) */}
                      <FormField
                        control={form.control}
                        name="facturacion"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Facturación</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Campo: Asist. Admon. (Checkbox) */}
                      <FormField
                        control={form.control}
                        name="asist_admon"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Asist. Admon.</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Campo: Cobros (Checkbox) */}
                      <FormField
                        control={form.control}
                        name="cobros"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Cobros</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Campo: Gerente Admon. (Checkbox) */}
                      <FormField
                        control={form.control}
                        name="gerente_admon"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Gerente Admon.</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Despacho</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Despacho</TableHead>
              <TableHead>Ruta</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>T. Contado</TableHead>
              <TableHead>T. Crédito</TableHead>
              <TableHead>T. General</TableHead>
              <TableHead>Bodega</TableHead>
              <TableHead>Reparto</TableHead>
              <TableHead>Facturación</TableHead>
              <TableHead>Asist. Admon.</TableHead>
              <TableHead>Cobros</TableHead>
              <TableHead>Gerente Admon.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((shipment) => (
              <TableRow key={shipment.id_despacho}>
                <TableCell className="font-medium">{shipment.id_despacho}</TableCell>
                <TableCell>{shipment.id_ruta}</TableCell>
                <TableCell>{shipment.fecha_despacho}</TableCell>
                <TableCell>${shipment.total_contado.toFixed(2)}</TableCell>
                <TableCell>${shipment.total_credito.toFixed(2)}</TableCell>
                <TableCell>${shipment.total_general.toFixed(2)}</TableCell>
                <TableCell><StatusBadge checked={shipment.bodega} /></TableCell>
                <TableCell><StatusBadge checked={shipment.reparto} /></TableCell>
                <TableCell><StatusBadge checked={shipment.facturacion} /></TableCell>
                <TableCell><StatusBadge checked={shipment.asist_admon} /></TableCell>
                <TableCell><StatusBadge checked={shipment.cobros} /></TableCell>
                <TableCell><StatusBadge checked={shipment.gerente_admon} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{shipments.length}</strong> de <strong>{shipments.length}</strong> despachos.
        </div>
      </CardFooter>
    </Card>
  )
}
