
'use client'

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Pencil, Upload, Camera } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"


const BUCKET_NAME = 'comprobante';

// Esquema para el formulario de edición de la factura del despacho
const shipmentInvoiceEditSchema = (maxAmount: number) => z.object({
  comprobante: z.string().optional(),
  forma_pago: z.enum(["Efectivo", "Tarjeta", "Transferencia"]),
  monto: z.coerce.number().min(0, "El monto debe ser un número positivo.").max(maxAmount, `El monto no puede ser mayor que el total de la factura: $${maxAmount.toFixed(2)}`),
  state: z.boolean(),
});

// Tipos de datos para la página de detalle del despacho.
type Shipment = {
  id_despacho: string
  id_ruta: string
  id_motorista: string
  id_auxiliar: string
  total_contado: number
  total_credito: number
  total_general: number
  fecha_despacho: string
  bodega: boolean
  reparto: boolean
  facturacion: boolean
  asist_admon: boolean
  cobros: boolean
  gerente_admon: boolean
}

type ShipmentInvoice = {
  id_fac_desp: number
  id_factura: string
  comprobante: string
  forma_pago: "Efectivo" | "Tarjeta" | "Transferencia"
  monto: number
  state: boolean
  invoice_number?: string | number // Opcional, se añade después
  tax_type?: string // Opcional, se añade después
  grand_total?: number // Opcional, se añade después
}

type User = { id_user: string; name: string }
type Route = { id_ruta: string; ruta_desc: string }
type Invoice = { id_factura: string, invoice_number: string | number, code_customer: string, grand_total: number }
type Customer = { code_customer: string; id_impuesto: number };
type TaxType = { id_impuesto: number; impt_desc: string };
const paymentMethods: ShipmentInvoice['forma_pago'][] = ["Efectivo", "Tarjeta", "Transferencia"];
const statusOptions: { label: string; value: boolean }[] = [
  { label: "Pagado", value: true },
  { label: "Pendiente", value: false },
]

// Componente reutilizable para mostrar un badge de estado del proceso.
const StatusBadge = ({ checked, text }: { checked: boolean, text: string }) => {
    return (
        <div className="flex items-center gap-2">
            <span className="font-medium">{text}:</span>
            <Badge variant={checked ? "default" : "outline"}>{checked ? "Completado" : "Pendiente"}</Badge>
        </div>
    )
}

export default function ShipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params
  const { toast } = useToast()

  // Estados para almacenar los datos de la página.
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [invoices, setInvoices] = useState<ShipmentInvoice[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para el diálogo de edición de factura
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [editingShipmentInvoice, setEditingShipmentInvoice] = useState<ShipmentInvoice | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para la cámara
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [invoiceForCamera, setInvoiceForCamera] = useState<ShipmentInvoice | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm<z.infer<ReturnType<typeof shipmentInvoiceEditSchema>>>({
    resolver: zodResolver(shipmentInvoiceEditSchema(editingShipmentInvoice?.grand_total || Number.MAX_SAFE_INTEGER)),
    defaultValues: {
      comprobante: "",
      forma_pago: "Efectivo",
      monto: 0,
      state: false,
    },
  });

  // Función principal para obtener todos los datos necesarios para la página.
  const fetchData = async () => {
    if (!id) return;
    setLoading(true)
    
    const [
      shipmentRes,
      usersRes,
      routesRes,
      shipmentInvoicesRes,
    ] = await Promise.all([
      supabase.from('despacho').select('*').eq('id_despacho', id).single(),
      supabase.from('usuario').select('id_user, name'),
      supabase.from('rutas').select('id_ruta, ruta_desc'),
      supabase.from('facturacion_x_despacho').select('*').eq('id_despacho', id),
    ]);

    if (shipmentRes.error) toast({ title: "Error", description: "No se pudo cargar el despacho.", variant: "destructive" })
    else setShipment(shipmentRes.data as Shipment)

    if (usersRes.error) toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" })
    else setUsers(usersRes.data as User[])

    if (routesRes.error) toast({ title: "Error", description: "No se pudieron cargar las rutas.", variant: "destructive" })
    else setRoutes(routesRes.data as Route[])
    
    if (shipmentInvoicesRes.error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas asociadas.", variant: "destructive" })
    } else {
      const shipmentInvoicesData = (shipmentInvoicesRes.data || []) as ShipmentInvoice[]
      const invoiceIds = shipmentInvoicesData.map(inv => inv.id_factura)

      if (invoiceIds.length > 0) {
          const { data: invoicesData, error: invoicesError } = await supabase.from('facturacion').select('id_factura, invoice_number, code_customer, grand_total').in('id_factura', invoiceIds)
          if (invoicesError) {
              toast({ title: "Error", description: "No se pudieron cargar los datos de facturas.", variant: "destructive" });
          } else {
              const customerCodes = (invoicesData || []).map(inv => inv.code_customer)
              const { data: customersData, error: customersError } = await supabase.from('customer').select('code_customer, id_impuesto').in('code_customer', customerCodes)
              if (customersError) {
                  toast({ title: "Error", description: "No se pudieron cargar los datos de clientes.", variant: "destructive" });
              } else {
                  const taxIds = (customersData || []).map(c => c.id_impuesto)
                  const { data: taxesData, error: taxesError } = await supabase.from('tipo_impuesto').select('id_impuesto, impt_desc').in('id_impuesto', taxIds)
                  if (taxesError) {
                      toast({ title: "Error", description: "No se pudieron cargar los tipos de impuesto.", variant: "destructive" });
                  } else {
                      const taxMap = new Map((taxesData || []).map(t => [t.id_impuesto, t.impt_desc]))
                      const customerTaxMap = new Map((customersData || []).map(c => [c.code_customer, taxMap.get(c.id_impuesto)]))
                      const invoiceInfoMap = new Map((invoicesData || []).map(i => [i.id_factura, {
                        invoice_number: i.invoice_number,
                        code_customer: i.code_customer,
                        grand_total: i.grand_total,
                      }]));

                      const enrichedInvoices = shipmentInvoicesData.map(si => {
                        const invoiceInfo = invoiceInfoMap.get(si.id_factura);
                        return {
                          ...si,
                          invoice_number: invoiceInfo?.invoice_number,
                          grand_total: invoiceInfo?.grand_total,
                          tax_type: customerTaxMap.get(invoiceInfo?.code_customer || '')
                        }
                      });
                      setInvoices(enrichedInvoices);
                  }
              }
          }
      } else {
        setInvoices([])
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id, toast])
  
  useEffect(() => {
    if (editingShipmentInvoice) {
      form.reset({
        comprobante: editingShipmentInvoice.comprobante,
        forma_pago: editingShipmentInvoice.forma_pago,
        monto: editingShipmentInvoice.monto,
        state: editingShipmentInvoice.state,
      });
    }
    setSelectedFile(null);
  }, [editingShipmentInvoice, form]);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!isCameraDialogOpen) return;
      setHasCameraPermission(false); // Reset on open
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast({
          variant: 'destructive',
          title: 'Acceso a la cámara denegado',
          description: 'Por favor, habilite los permisos de la cámara en su navegador.',
        });
        closeCameraDialog();
      }
    };
    getCameraPermission();

    return () => { // Cleanup on unmount or when dialog closes
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isCameraDialogOpen, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadComprobante = async (): Promise<string | undefined> => {
    if (!selectedFile) {
      return editingShipmentInvoice?.comprobante;
    }
    setLoading(true);
    const fileName = `${Date.now()}-${selectedFile.name}`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, selectedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    setLoading(false);
    if (error) {
      toast({ title: "Error al subir imagen", description: error.message, variant: "destructive" });
      return undefined;
    }
    
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return publicUrl;
  };

  const handleEditInvoice = (invoice: ShipmentInvoice) => {
    setEditingShipmentInvoice(invoice);
    setIsInvoiceDialogOpen(true);
  };
  
  const handleUpdateInvoice = async (values: z.infer<ReturnType<typeof shipmentInvoiceEditSchema>>) => {
    if (!editingShipmentInvoice) return;

    const imageUrl = await uploadComprobante();
    if (!imageUrl && selectedFile) { 
        return; 
    }

    const { error } = await supabase
      .from('facturacion_x_despacho')
      .update({
          comprobante: imageUrl,
          forma_pago: values.forma_pago,
          monto: values.monto,
          state: values.state
      })
      .eq('id_fac_desp', editingShipmentInvoice.id_fac_desp);
    
    if (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar la factura del despacho.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Factura del despacho actualizada correctamente.",
      });
      fetchData();
      closeInvoiceDialog();
    }
  };

  const closeInvoiceDialog = () => {
    setIsInvoiceDialogOpen(false);
    setEditingShipmentInvoice(null);
    setSelectedFile(null);
    form.reset();
  };

  const openCameraDialog = (invoice: ShipmentInvoice) => {
    setInvoiceForCamera(invoice);
    setIsCameraDialogOpen(true);
  };

  const closeCameraDialog = () => {
    setIsCameraDialogOpen(false);
    setInvoiceForCamera(null);
    setCapturedImage(null);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
    }
  };

  const saveCapturedPhoto = async () => {
    if (!capturedImage || !invoiceForCamera) return;

    setLoading(true);
    // Convert data URL to Blob
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const fileName = `${Date.now()}-comprobante.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    // Upload to Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, { upsert: false });

    if (uploadError) {
      setLoading(false);
      toast({ title: "Error al subir imagen", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    // Update the database
    const { error: dbError } = await supabase
      .from('facturacion_x_despacho')
      .update({ comprobante: publicUrl })
      .eq('id_fac_desp', invoiceForCamera.id_fac_desp);

    setLoading(false);

    if (dbError) {
      toast({ title: "Error al guardar", description: "No se pudo actualizar la factura.", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Comprobante guardado correctamente." });
      fetchData();
      closeCameraDialog();
    }
  };


  const getRouteDescription = (routeId: string) => routes.find(route => String(route.id_ruta) === String(routeId))?.ruta_desc || routeId
  const getUserName = (userId: string) => users.find(user => String(user.id_user) === String(userId))?.name || userId
  const getStatusLabel = (status: boolean) => status ? "Pagado" : "Pendiente"
  const getBadgeVariant = (status: boolean) => status ? "default" : "secondary"

  const fiscalCreditInvoices = invoices.filter(inv => inv.tax_type === 'Crédito Fiscal');
  const finalConsumerInvoices = invoices.filter(inv => inv.tax_type === 'Consumidor Final');
  const otherInvoices = invoices.filter(inv => inv.tax_type !== 'Crédito Fiscal' && inv.tax_type !== 'Consumidor Final');

  if (loading && !shipment) {
    return <p>Cargando detalles del despacho...</p>
  }

  if (!shipment) {
    return <p>Despacho no encontrado.</p>
  }

  const renderInvoicesTable = (invoiceList: ShipmentInvoice[], title: string, description: string) => (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Factura</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Total Factura</TableHead>
              <TableHead>Forma de Pago</TableHead>
              <TableHead>Monto Pagado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceList.length > 0 ? invoiceList.map((invoice) => (
              <TableRow key={invoice.id_fac_desp}>
                <TableCell className="font-medium">{String(invoice.invoice_number || invoice.id_factura)}</TableCell>
                <TableCell>
                    {invoice.comprobante ? (
                      <a href={invoice.comprobante} target="_blank" rel="noopener noreferrer">
                        <Image
                            src={invoice.comprobante}
                            alt={`Comprobante de ${invoice.id_factura}`}
                            width={60}
                            height={60}
                            className="h-16 w-16 rounded-md object-cover"
                        />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                </TableCell>
                <TableCell>${(invoice.grand_total ?? 0).toFixed(2)}</TableCell>
                <TableCell>{invoice.forma_pago}</TableCell>
                <TableCell>${invoice.monto.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={getBadgeVariant(invoice.state)}>
                    {getStatusLabel(invoice.state)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditInvoice(invoice)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openCameraDialog(invoice)}>
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                  <TableCell colSpan={7} className="text-center">No hay facturas en esta categoría.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
          <div className="text-xs text-muted-foreground">
              Mostrando <strong>{invoiceList.length}</strong> de <strong>{invoiceList.length}</strong> facturas.
          </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Detalle del Despacho #{shipment.id_despacho}</CardTitle>
              <CardDescription>
                Información detallada del despacho y su estado actual.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Despachos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Ruta</p>
              <p>{getRouteDescription(shipment.id_ruta)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Motorista</p>
              <p>{getUserName(shipment.id_motorista)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Auxiliar</p>
              <p>{getUserName(shipment.id_auxiliar)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Fecha de Despacho</p>
              <p>{new Date(shipment.fecha_despacho).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Contado</p>
              <p>${shipment.total_contado.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Crédito</p>
              <p>${shipment.total_credito.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total General</p>
              <p className="font-bold">${shipment.total_general.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
         <CardHeader><CardTitle>Estado del Proceso</CardTitle></CardHeader>
         <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <StatusBadge checked={shipment.facturacion} text="Facturación"/>
            <StatusBadge checked={shipment.bodega} text="Bodega"/>
            <StatusBadge checked={shipment.reparto} text="Reparto"/>
            <StatusBadge checked={shipment.asist_admon} text="Asist. Admon."/>
            <StatusBadge checked={shipment.gerente_admon} text="Gerente Admon."/>
            <StatusBadge checked={shipment.cobros} text="Cobros"/>
         </CardContent>
      </Card>

      <div className="space-y-6">
        {renderInvoicesTable(fiscalCreditInvoices, "Facturación - Crédito Fiscal", "Facturas asociadas a clientes de tipo Crédito Fiscal.")}
        {renderInvoicesTable(finalConsumerInvoices, "Facturación - Consumidor Final", "Facturas asociadas a clientes de tipo Consumidor Final.")}
        {otherInvoices.length > 0 && renderInvoicesTable(otherInvoices, "Facturación - Otros", "Facturas sin un tipo de cliente especificado.")}
      </div>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Factura del Despacho</DialogTitle>
            <DialogDescription>
              Modifique los detalles de la factura o cargue un nuevo comprobante.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateInvoice)} className="space-y-4">
              <FormItem>
                  <FormLabel>Comprobante</FormLabel>
                   <FormControl>
                     <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                      />
                  </FormControl>
                  <FormMessage />
                  {selectedFile && <p className="text-sm text-muted-foreground mt-2">Nuevo archivo: {selectedFile.name}</p>}
                  {editingShipmentInvoice?.comprobante && !selectedFile && (
                      <div className="mt-2">
                          <p className="text-sm text-muted-foreground">Comprobante actual:</p>
                          <a href={editingShipmentInvoice.comprobante} target="_blank" rel="noopener noreferrer">
                              <Image src={editingShipmentInvoice.comprobante} alt="Comprobante actual" width={80} height={80} className="rounded-md object-cover mt-1" />
                          </a>
                      </div>
                  )}
              </FormItem>
              
              <FormField
                control={form.control}
                name="forma_pago"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una forma de pago" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'true')}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.label} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" onClick={closeInvoiceDialog}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for Camera */}
      <Dialog open={isCameraDialogOpen} onOpenChange={closeCameraDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capturar Comprobante</DialogTitle>
            <DialogDescription>
              Apunta la cámara al comprobante y toma la foto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
             {capturedImage ? (
               <div className="space-y-4">
                  <Image src={capturedImage} alt="Comprobante capturado" width={400} height={300} className="w-full h-auto rounded-md" />
               </div>
            ) : (
              <div className="space-y-4">
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                {!hasCameraPermission && (
                  <Alert variant="destructive">
                    <AlertTitle>Se requiere acceso a la cámara</AlertTitle>
                    <AlertDescription>
                      Por favor, permite el acceso a la cámara para usar esta función.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={closeCameraDialog}>Cancelar</Button>
            {capturedImage ? (
                <>
                    <Button variant="outline" onClick={() => setCapturedImage(null)}>Tomar de nuevo</Button>
                    <Button onClick={saveCapturedPhoto} disabled={loading}>{loading ? "Guardando..." : "Guardar Foto"}</Button>
                </>
            ) : (
                <Button onClick={takePhoto} disabled={!hasCameraPermission}>Tomar Foto</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
