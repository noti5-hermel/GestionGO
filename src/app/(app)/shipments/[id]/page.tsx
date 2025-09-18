
'use client'

import { useState, useEffect, useRef, useMemo } from "react"
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
import { ArrowLeft, Pencil, Upload, Camera, X, FileText, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { generateShipmentPDF } from "@/lib/generate-shipment-pdf"
import { PdfPreviewModal } from "@/components/pdf-preview-modal"

/**
 * @file shipments/[id]/page.tsx
 * @description Página de detalle para un despacho específico. Muestra la información del despacho,
 * el estado del proceso, y una lista de todas las facturas asociadas. Permite editar
 * los detalles de pago de cada factura y subir/capturar comprobantes.
 * Para motoristas, la edición está restringida por geocerca.
 */

const BUCKET_NAME = 'comprobante';

/**
 * Esquema de validación para el formulario de edición de la factura del despacho.
 * El `maxAmount` se pasa dinámicamente para asegurar que el monto pagado no exceda el total de la factura.
 */
const shipmentInvoiceEditSchema = (maxAmount: number) => z.object({
  comprobante: z.string().optional(),
  forma_pago: z.enum(["Efectivo", "Tarjeta", "Transferencia"]),
  monto: z.coerce.number().min(0, "El monto debe ser un número positivo.").max(maxAmount, `El monto no puede ser mayor que el total de la factura: $${maxAmount.toFixed(2)}`),
  state: z.boolean(),
  fecha_entrega: z.string().optional().nullable(),
});

type ShipmentInvoiceEditValues = z.infer<ReturnType<typeof shipmentInvoiceEditSchema>>;

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

export type ShipmentInvoice = {
  id_fac_desp: number
  id_factura: string
  code_customer: string
  comprobante: string
  forma_pago: "Efectivo" | "Tarjeta" | "Transferencia"
  monto: number
  state: boolean
  fecha_entrega: string | null;
  reference_number?: string | number // Opcional, se añade después desde la tabla `facturacion`
  customer_name?: string
  tax_type?: string // Opcional, se añade después a través de joins
  grand_total: number // No es opcional para la validación
}

type User = { id_user: string; name: string; id_rol: number; }
type Role = { id_ruta: string; ruta_desc: string }
type Invoice = { id_factura: string, reference_number: string | number, code_customer: string, customer_name: string, grand_total: number }
type Customer = { code_customer: string; id_impuesto: number };
type TaxType = { id_impuesto: number; impt_desc: string };
const paymentMethods: ShipmentInvoice['forma_pago'][] = ["Efectivo", "Tarjeta", "Transferencia"];
const statusOptions: { label: string; value: boolean }[] = [
  { label: "Pagado", value: true },
  { label: "Pendiente", value: false },
]

/** Componente reutilizable para mostrar un badge de estado del proceso. */
const StatusBadge = ({ checked, text }: { checked: boolean, text: string }) => {
    return (
        <div className="flex items-center gap-2">
            <span className="font-medium">{text}:</span>
            <Badge variant={checked ? "default" : "outline"}>{checked ? "Completado" : "Pendiente"}</Badge>
        </div>
    )
}

/**
 * Componente principal de la página de detalle de despacho.
 */
export default function ShipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params
  const { toast } = useToast()

  // --- ESTADOS ---
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [invoices, setInvoices] = useState<ShipmentInvoice[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [routes, setRoutes] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para el diálogo de edición de factura.
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [editingShipmentInvoice, setEditingShipmentInvoice] = useState<ShipmentInvoice | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para el modal de visualización de imagen.
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  // Estados para la funcionalidad de la cámara.
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [invoiceForCamera, setInvoiceForCamera] = useState<ShipmentInvoice | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Estados para la previsualización del PDF.
  const [pdfData, setPdfData] = useState<{ dataUri: string; fileName: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [verifyingLocationInvoiceId, setVerifyingLocationInvoiceId] = useState<number | null>(null);


  // --- FORMULARIO ---
  const form = useForm<ShipmentInvoiceEditValues>({
    defaultValues: {
      comprobante: "",
      forma_pago: "Efectivo",
      monto: 0,
      state: false,
      fecha_entrega: null,
    },
  });

  // --- LÓGICA DE DATOS Y EFECTOS ---

  /**
   * Función principal para obtener todos los datos necesarios para la página:
   * detalles del despacho, usuarios, rutas y facturas asociadas (con datos enriquecidos).
   */
  const fetchData = async () => {
    if (!id) return;
    setLoading(true)
    
    // 1. Obtiene los datos principales en paralelo.
    const [
      shipmentRes,
      usersRes,
      routesRes,
      shipmentInvoicesRes,
    ] = await Promise.all([
      supabase.from('despacho').select('*').eq('id_despacho', id).single(),
      supabase.from('usuario').select('id_user, name, id_rol'),
      supabase.from('rutas').select('id_ruta, ruta_desc'),
      supabase.from('facturacion_x_despacho').select('*, facturacion(code_customer)').eq('id_despacho', id),
    ]);

    if (shipmentRes.error) toast({ title: "Error", description: "No se pudo cargar el despacho.", variant: "destructive" })
    else setShipment(shipmentRes.data as Shipment)

    if (usersRes.error) toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" })
    else setUsers(usersRes.data as User[])

    if (routesRes.error) toast({ title: "Error", description: "No se pudieron cargar las rutas.", variant: "destructive" })
    else setRoutes(routesRes.data as Role[])
    
    // 2. Si hay facturas asociadas, las enriquece con datos de otras tablas.
    if (shipmentInvoicesRes.error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas asociadas.", variant: "destructive" })
    } else {
       // @ts-ignore
      const shipmentInvoicesData = (shipmentInvoicesRes.data || []).map(si => ({...si, code_customer: si.facturacion.code_customer})) as ShipmentInvoice[];
      const invoiceIds = shipmentInvoicesData.map(inv => inv.id_factura)

      if (invoiceIds.length > 0) {
          // Obtiene detalles de las facturas.
          const { data: invoicesData, error: invoicesError } = await supabase.from('facturacion').select('id_factura, reference_number, code_customer, customer_name, grand_total').in('id_factura', invoiceIds)
          if (invoicesError) {
              toast({ title: "Error", description: "No se pudieron cargar los datos de facturas.", variant: "destructive" });
          } else {
              // Obtiene detalles de los clientes para saber el tipo de impuesto.
              const customerCodes = (invoicesData || []).map(inv => inv.code_customer)
              const { data: customersData, error: customersError } = await supabase.from('customer').select('code_customer, id_impuesto').in('code_customer', customerCodes)
              if (customersError) {
                  toast({ title: "Error", description: "No se pudieron cargar los datos de clientes.", variant: "destructive" });
              } else {
                  // Obtiene los tipos de impuesto.
                  const taxIds = (customersData || []).map(c => c.id_impuesto)
                  const { data: taxesData, error: taxesError } = await supabase.from('tipo_impuesto').select('id_impuesto, impt_desc').in('id_impuesto', taxIds)
                  if (taxesError) {
                      toast({ title: "Error", description: "No se pudieron cargar los tipos de impuesto.", variant: "destructive" });
                  } else {
                      // Crea mapas para un acceso rápido y eficiente a los datos.
                      const taxMap = new Map((taxesData || []).map(t => [t.id_impuesto, t.impt_desc]))
                      const customerTaxMap = new Map((customersData || []).map(c => [c.code_customer, taxMap.get(c.id_impuesto)]))
                      const invoiceInfoMap = new Map((invoicesData || []).map(i => [i.id_factura, {
                        reference_number: i.reference_number,
                        code_customer: i.code_customer,
                        customer_name: i.customer_name,
                        grand_total: i.grand_total,
                      }]));

                      // Combina todos los datos en un solo array de facturas enriquecidas.
                      const enrichedInvoices = shipmentInvoicesData.map(si => {
                        const invoiceInfo = invoiceInfoMap.get(si.id_factura);
                        return {
                          ...si,
                          reference_number: invoiceInfo?.reference_number,
                          customer_name: invoiceInfo?.customer_name,
                          grand_total: invoiceInfo?.grand_total ?? 0,
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
    try {
      const userSession = localStorage.getItem('user-session');
      if (userSession) {
        setCurrentUser(JSON.parse(userSession));
      }
    } catch (error) {
      console.error("Failed to parse user session from localStorage", error);
    }
  }, []);

  // Efecto para cargar todos los datos cuando el ID del despacho cambia.
  useEffect(() => {
    fetchData()
  }, [id, toast])
  
  // Efecto para rellenar el formulario de edición cuando se selecciona una factura.
  useEffect(() => {
    if (editingShipmentInvoice) {
        // Resetea los valores del formulario.
        form.reset({
            comprobante: editingShipmentInvoice.comprobante,
            forma_pago: editingShipmentInvoice.forma_pago,
            monto: editingShipmentInvoice.monto,
            state: editingShipmentInvoice.state,
            fecha_entrega: editingShipmentInvoice.fecha_entrega,
        });
    }
    setSelectedFile(null);
  }, [editingShipmentInvoice, form]);

  // Efecto para manejar el acceso y la limpieza de la cámara.
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

    return () => { // Cleanup: detiene la cámara al cerrar el diálogo.
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isCameraDialogOpen, toast]);

  /**
   * Sube un archivo de comprobante a Supabase Storage.
   * @returns La URL pública de la imagen subida.
   */
  const uploadComprobante = async (): Promise<string | undefined> => {
    // Si se está editando y hay un archivo nuevo, elimina el antiguo primero.
    if (selectedFile && editingShipmentInvoice?.comprobante) {
        const oldFileName = editingShipmentInvoice.comprobante.split('/').pop();
        if (oldFileName) {
            await supabase.storage.from(BUCKET_NAME).remove([oldFileName]);
        }
    }

    if (!selectedFile) {
      return editingShipmentInvoice?.comprobante; // Mantiene la imagen existente si no se selecciona una nueva.
    }
    setLoading(true);
    const fileName = `${Date.now()}-${selectedFile.name}`;
    const { error } = await supabase.storage
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

  /**
   * Actualiza los detalles de una factura asociada al despacho.
   * @param values Los datos del formulario de edición.
   */
  const handleUpdateInvoice = async (values: ShipmentInvoiceEditValues) => {
    if (!editingShipmentInvoice) return;

    // 1. Validar manualmente los datos del formulario contra el esquema dinámico
    const validationSchema = shipmentInvoiceEditSchema(editingShipmentInvoice.grand_total);
    const validationResult = validationSchema.safeParse(values);
    
    if (!validationResult.success) {
      // Si la validación falla, muestra el error en el campo correspondiente
      const { errors } = validationResult.error;
      if (errors[0] && errors[0].path[0] === 'monto') {
        form.setError('monto', { type: 'manual', message: errors[0].message });
      }
      return; // Detiene la ejecución
    }

    // 2. Si la validación es exitosa, proceder a guardar
    const imageUrl = await uploadComprobante();
    if (!imageUrl && selectedFile) { 
        return; // Detiene si la carga falla.
    }

    const dataToUpdate: any = {
        comprobante: imageUrl,
        forma_pago: values.forma_pago,
        monto: values.monto,
        state: values.state
    };

    // Si se subió un nuevo archivo, se establece la fecha de entrega.
    if (selectedFile) {
        dataToUpdate.fecha_entrega = new Date().toISOString();
    }

    const { error } = await supabase
      .from('facturacion_x_despacho')
      .update(dataToUpdate)
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
      fetchData(); // Recarga los datos para reflejar los cambios.
      closeInvoiceDialog();
    }
  };

  /**
   * Guarda una foto capturada con la cámara como comprobante.
   */
  const saveCapturedPhoto = async () => {
    if (!capturedImage || !invoiceForCamera) return;

    setLoading(true);
    // Si ya existe un comprobante, bórralo primero.
    if (invoiceForCamera.comprobante) {
        const oldFileName = invoiceForCamera.comprobante.split('/').pop();
        if (oldFileName) {
            await supabase.storage.from(BUCKET_NAME).remove([oldFileName]);
        }
    }
    
    // Convierte la imagen en formato DataURL a un Blob para subirla.
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const fileName = `${Date.now()}-comprobante.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    // Sube el archivo a Supabase Storage.
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, { upsert: false });

    if (uploadError) {
      setLoading(false);
      toast({ title: "Error al subir imagen", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    // Actualiza el registro en la base de datos con la nueva URL y la fecha de entrega.
    const { error: dbError } = await supabase
      .from('facturacion_x_despacho')
      .update({ 
          comprobante: publicUrl,
          fecha_entrega: new Date().toISOString(),
       })
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
  
  const handleGeofenceProtectedAction = (invoice: ShipmentInvoice, onSuccess: (invoice: ShipmentInvoice) => void) => {
    if (currentUser?.role?.toLowerCase() !== 'motorista') {
        onSuccess(invoice);
        return;
    }
    
    setVerifyingLocationInvoiceId(invoice.id_fac_desp);

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const { data, error } = await supabase.rpc('is_user_in_client_geofence', {
                user_latitude: latitude,
                user_longitude: longitude,
                p_code_customer: invoice.code_customer,
            });

            setVerifyingLocationInvoiceId(null);
            
            if (error) {
                toast({ title: "Error de verificación", description: "No se pudo comprobar la ubicación.", variant: "destructive" });
                return;
            }

            if (data === true) {
                onSuccess(invoice);
            } else {
                toast({ title: "Acción no permitida", description: "Debe estar dentro de la geocerca del cliente para realizar esta acción.", variant: "destructive" });
            }
        },
        (error) => {
            setVerifyingLocationInvoiceId(null);
            toast({ title: "Error de ubicación", description: "No se pudo obtener su ubicación. Asegúrese de tener los permisos activados.", variant: "destructive" });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
};


  // --- FUNCIONES AUXILIARES DE LA UI ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleEditInvoice = (invoice: ShipmentInvoice) => {
    handleGeofenceProtectedAction(invoice, (inv) => {
      setEditingShipmentInvoice(inv);
      setIsInvoiceDialogOpen(true);
    });
  };
  const closeInvoiceDialog = () => {
    setIsInvoiceDialogOpen(false);
    setEditingShipmentInvoice(null);
    setSelectedFile(null);
    form.reset();
  };
  const handleOpenImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  }
  const openCameraDialog = (invoice: ShipmentInvoice) => {
      handleGeofenceProtectedAction(invoice, (inv) => {
      setInvoiceForCamera(inv);
      setIsCameraDialogOpen(true);
    });
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
  const getRouteDescription = (routeId: string) => routes.find(route => String(route.id_ruta) === String(routeId))?.ruta_desc || routeId
  const getUserName = (userId: string) => users.find(user => String(user.id_user) === String(userId))?.name || userId
  const getStatusLabel = (status: boolean) => status ? "Pagado" : "Pendiente"
  const getBadgeVariant = (status: boolean) => status ? "default" : "secondary"
  const formatDate = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00Z`);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  };
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  };
  const handleGeneratePdf = () => {
    if (shipment) {
      const pdfOutput = generateShipmentPDF(
        shipment,
        invoices,
        routes.find(r => r.id_ruta === shipment.id_ruta) || { ruta_desc: 'N/A' },
        users.find(u => u.id_user === shipment.id_motorista) || { name: 'N/A', id_rol: 0 },
        users.find(u => u.id_user === shipment.id_auxiliar) || { name: 'N/A', id_rol: 0 }
      );
      setPdfData(pdfOutput);
      setIsPreviewOpen(true);
    }
  };
  
  // Separa las facturas por tipo de cliente para renderizarlas en tablas distintas.
  const fiscalCreditInvoices = invoices.filter(inv => inv.tax_type === 'Crédito Fiscal');
  const finalConsumerInvoices = invoices.filter(inv => inv.tax_type === 'Consumidor Final');
  const otherInvoices = invoices.filter(inv => inv.tax_type !== 'Crédito Fiscal' && inv.tax_type !== 'Consumidor Final');

  // Calcula los totales dinámicamente basados en el `monto` de las facturas cargadas.
  const { totalContadoCalculado, totalCreditoCalculado, totalGeneralCalculado } = useMemo(() => {
      const totalContadoCalculado = finalConsumerInvoices.reduce((acc, inv) => acc + inv.monto, 0);
      const totalCreditoCalculado = fiscalCreditInvoices.reduce((acc, inv) => acc + inv.monto, 0);
      const totalGeneralCalculado = totalContadoCalculado + totalCreditoCalculado;
      return { totalContadoCalculado, totalCreditoCalculado, totalGeneralCalculado };
  }, [invoices]);

  if (loading && !shipment) {
    return <p>Cargando detalles del despacho...</p>
  }
  if (!shipment) {
    return <p>Despacho no encontrado.</p>
  }
  
  /** Renderiza una tabla de facturas para una categoría específica. */
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
              <TableHead>Nombre del Cliente</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Fecha Entrega</TableHead>
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
                <TableCell className="font-medium">{String(invoice.reference_number || invoice.id_factura)}</TableCell>
                <TableCell>{invoice.customer_name || 'N/A'}</TableCell>
                <TableCell>
                    {invoice.comprobante ? (
                      <button onClick={() => handleOpenImageModal(invoice.comprobante)}>
                        <Image
                            src={invoice.comprobante}
                            alt={`Comprobante de ${invoice.id_factura}`}
                            width={60}
                            height={60}
                            className="h-16 w-16 rounded-md object-cover"
                        />
                      </button>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                </TableCell>
                <TableCell>{formatDateTime(invoice.fecha_entrega)}</TableCell>
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
                    <Button variant="ghost" size="icon" onClick={() => handleEditInvoice(invoice)} disabled={verifyingLocationInvoiceId === invoice.id_fac_desp}>
                      {verifyingLocationInvoiceId === invoice.id_fac_desp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openCameraDialog(invoice)} disabled={verifyingLocationInvoiceId === invoice.id_fac_desp}>
                       {verifyingLocationInvoiceId === invoice.id_fac_desp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                  <TableCell colSpan={9} className="text-center">No hay facturas en esta categoría.</TableCell>
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

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Detalle del Despacho #{shipment.id_despacho}</CardTitle>
              <CardDescription>
                Información detallada del despacho y su estado actual.
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={handleGeneratePdf} className="w-full md:w-auto">
                <FileText className="mr-2 h-4 w-4" /> Ver Informe
              </Button>
              <Button variant="outline" onClick={() => router.back()} className="w-full md:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Despachos
              </Button>
            </div>
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
              <p>{formatDate(shipment.fecha_despacho)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Contado</p>
              <p>${totalContadoCalculado.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Crédito</p>
              <p>${totalCreditoCalculado.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total General</p>
              <p className="font-bold">${totalGeneralCalculado.toFixed(2)}</p>
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

      {/* Diálogo para editar una factura del despacho */}
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
                          <button type="button" onClick={() => handleOpenImageModal(editingShipmentInvoice.comprobante)}>
                            <Image src={editingShipmentInvoice.comprobante} alt="Comprobante actual" width={80} height={80} className="rounded-md object-cover mt-1" />
                          </button>
                      </div>
                  )}
              </FormItem>
              
               <FormField
                control={form.control}
                name="fecha_entrega"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Entrega</FormLabel>
                    <FormControl>
                      <Input value={formatDateTime(field.value)} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
      
      {/* Diálogo para visualizar la imagen del comprobante */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Vista Previa del Comprobante</DialogTitle>
            </DialogHeader>
            <Image
                src={selectedImage}
                alt="Comprobante"
                width={800}
                height={600}
                className="w-full h-auto rounded-md object-contain"
            />
        </DialogContent>
      </Dialog>

      {/* Diálogo para capturar una foto con la cámara */}
      <Dialog open={isCameraDialogOpen} onOpenChange={closeCameraDialog}>
        <DialogContent className="p-0 border-0 bg-black max-w-full h-full sm:h-auto sm:max-w-3xl flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>Capturar Comprobante</DialogTitle>
            <DialogDescription>Use su cámara para tomar una foto del comprobante.</DialogDescription>
          </DialogHeader>
           <div className="relative flex-1 w-full h-full">
            {capturedImage ? (
                <Image src={capturedImage} alt="Comprobante capturado" layout="fill" className="object-contain" />
            ) : (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                {!hasCameraPermission && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                        <Alert variant="destructive" className="w-4/5 max-w-md">
                            <AlertTitle>Se requiere acceso a la cámara</AlertTitle>
                            <AlertDescription>
                            Por favor, permite el acceso a la cámara para usar esta función.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Controles de la cámara */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex justify-center items-center gap-4">
                     {capturedImage ? (
                        <>
                           <Button variant="outline" onClick={() => setCapturedImage(null)} className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30">
                                Tomar de nuevo
                           </Button>
                           <Button onClick={saveCapturedPhoto} disabled={loading} className="bg-primary/80 backdrop-blur-sm text-primary-foreground hover:bg-primary">
                               {loading ? "Guardando..." : "Guardar Foto"}
                           </Button>
                        </>
                    ) : (
                        <button 
                            onClick={takePhoto} 
                            disabled={!hasCameraPermission}
                            className="h-20 w-20 rounded-full border-4 border-white bg-white/30 backdrop-blur-sm ring-4 ring-black/30 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Tomar Foto"
                        />
                    )}
                </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={closeCameraDialog}
              className="absolute top-4 right-4 text-white bg-black/30 hover:bg-black/50 h-10 w-10 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal para la previsualización del PDF */}
      {pdfData && (
        <PdfPreviewModal
          isOpen={isPreviewOpen}
          setIsOpen={setIsPreviewOpen}
          pdfDataUri={pdfData.dataUri}
          fileName={pdfData.fileName}
        />
      )}
    </div>
  )
}

    