'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
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
import { ArrowLeft, Pencil, Upload, Camera, X, FileText, Loader2, MapPin, Play, Square, ListOrdered, ArrowUp, ArrowDown, Search, PlusCircle, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { generateShipmentPDF } from "@/lib/generate-shipment-pdf"
import { PdfPreviewModal } from "@/components/pdf-preview-modal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AsyncCombobox } from "@/components/ui/async-combobox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

/**
 * @file shipments/[id]/page.tsx
 * @description Página de detalle para un despacho.
 * Permite gestionar el estado del recorrido, editar facturas, subir comprobantes.
 * La creación y eliminación de facturas del despacho está limitada al rol ADMIN.
 */

const BUCKET_NAME = 'comprobante';

const shipmentInvoiceEditSchema = z.object({
  comprobante: z.string().optional(),
  forma_pago: z.enum(["Efectivo", "Tarjeta", "Transferencia", "Cheque", "Quedan", "Firma", "Credito", "Devolucion"]),
  monto: z.coerce.number().min(0, "El monto debe ser un número positivo."),
  state: z.boolean(),
  fecha_entrega: z.string().optional().nullable(),
});

type ShipmentInvoiceEditValues = z.infer<typeof shipmentInvoiceEditSchema>;

const newInvoiceInShipmentSchema = z.object({
  id_factura: z.string().min(1, "El número de factura es requerido."),
  code_customer: z.string().min(1, "El código de cliente es requerido."),
  customer_name: z.string().min(1, "El nombre del cliente es requerido."),
  grand_total: z.coerce.number().min(0.01, "El total debe ser mayor a 0."),
  ruta: z.string().min(1, "La ruta es requerida."),
});

type NewInvoiceInShipmentValues = z.infer<typeof newInvoiceInShipmentSchema>;

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
  estado_recorrido: 'pendiente' | 'en_curso' | 'finalizado';
}

export type ShipmentInvoice = {
  id_fac_desp: number
  id_factura: string
  code_customer: string
  comprobante: string
  forma_pago: "Efectivo" | "Tarjeta" | "Transferencia" | "Cheque" | "Quedan" | "Firma" | "Credito" | "Devolucion"
  monto: number
  state: boolean
  fecha_entrega: string | null;
  orden_visita: number | null;
  reference_number?: string | number
  customer_name?: string
  tax_type?: string
  net_to_pay: number
  geocerca?: any;
}

type ShipmentInvoiceWithLocation = ShipmentInvoice & {
  _capturedLocation?: { latitude: number; longitude: number } | null;
}

type User = { id_user: string; name: string; id_rol: number; }
type Role = { id_ruta: string; ruta_desc: string }
const paymentMethods: ShipmentInvoice['forma_pago'][] = ["Efectivo", "Tarjeta", "Transferencia", "Cheque", "Quedan", "Firma", "Credito", "Devolucion"];
const BODEGA_LOCATION = { lat: 13.725410116705362, lng: -89.21911777270175 };

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

  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [invoices, setInvoices] = useState<ShipmentInvoice[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [routes, setRoutes] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [editingShipmentInvoice, setEditingShipmentInvoice] = useState<ShipmentInvoiceWithLocation | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [invoiceForCamera, setInvoiceForCamera] = useState<ShipmentInvoiceWithLocation | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfData, setPdfData] = useState<{ dataUri: string; fileName: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [verifyingLocationInvoiceId, setVerifyingLocationInvoiceId] = useState<number | null>(null);
  const [orderedRoute, setOrderedRoute] = useState<ShipmentInvoice[]>([]);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddInvoiceDialogOpen, setIsAddInvoiceDialogOpen] = useState(false);

  const form = useForm<ShipmentInvoiceEditValues>({
    resolver: zodResolver(shipmentInvoiceEditSchema),
    defaultValues: {
      comprobante: "",
      forma_pago: "Efectivo",
      monto: 0,
      state: false,
      fecha_entrega: null,
    },
  });

  const addInvoiceForm = useForm<NewInvoiceInShipmentValues>({
    resolver: zodResolver(newInvoiceInShipmentSchema),
    defaultValues: {
      id_factura: "",
      code_customer: "",
      customer_name: "",
      grand_total: 0,
      ruta: "",
    },
  });

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
    
    if (shipmentInvoicesRes.error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas asociadas.", variant: "destructive" })
    } else {
       // @ts-ignore
      const shipmentInvoicesData = (shipmentInvoicesRes.data || []).map(si => ({...si, code_customer: si.facturacion.code_customer})) as ShipmentInvoice[];
      const invoiceIds = shipmentInvoicesData.map(inv => inv.id_factura)

      if (invoiceIds.length > 0) {
          const { data: invoicesData, error: invoicesError } = await supabase.from('facturacion').select('id_factura, reference_number, code_customer, customer_name, net_to_pay').in('id_factura', invoiceIds)
          if (invoicesError) {
              toast({ title: "Error", description: "No se pudieron cargar los datos de facturas.", variant: "destructive" });
          } else {
              const customerCodes = (invoicesData || []).map(inv => inv.code_customer)
              const { data: customersData, error: customersError } = await supabase.from('customer').select('code_customer, id_impuesto, geocerca').in('code_customer', customerCodes)
              if (customersError) {
                  toast({ title: "Error", description: "No se pudieron cargar los datos de clientes.", variant: "destructive" });
              } else {
                  const taxIds = (customersData || []).map(c => c.id_impuesto)
                  const { data: taxesData, error: taxesError } = await supabase.from('tipo_impuesto').select('id_impuesto, impt_desc').in('id_impuesto', taxIds)
                  if (taxesError) {
                      toast({ title: "Error", description: "No se pudieron cargar los tipos de impuesto.", variant: "destructive" });
                  } else {
                      const taxMap = new Map((taxesData || []).map(t => [t.id_impuesto, t.impt_desc]))
                      const customerMap = new Map((customersData || []).map(c => [c.code_customer, { tax: taxMap.get(c.id_impuesto), geofence: c.geocerca }]));

                      const invoiceInfoMap = new Map((invoicesData || []).map(i => [i.id_factura, {
                        reference_number: i.reference_number,
                        code_customer: i.code_customer,
                        customer_name: i.customer_name,
                        net_to_pay: i.net_to_pay,
                      }]));

                      const enrichedInvoices = shipmentInvoicesData.map(si => {
                        const invoiceInfo = invoiceInfoMap.get(si.id_factura);
                        const customerInfo = customerMap.get(invoiceInfo?.code_customer || '');
                        const normalizedState: boolean = si.state === true;
                        return {
                          ...si,
                          state: normalizedState,
                          reference_number: invoiceInfo?.reference_number,
                          code_customer: invoiceInfo?.code_customer,
                          customer_name: invoiceInfo?.customer_name,
                          net_to_pay: invoiceInfo?.net_to_pay ?? 0,
                          tax_type: customerInfo?.tax,
                          geocerca: customerInfo?.geofence,
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
      if (userSession) setCurrentUser(JSON.parse(userSession));
    } catch (error) {
      console.error("Failed to parse user session", error);
    }
  }, []);

  useEffect(() => {
    fetchData()
  }, [id])
  
  useEffect(() => {
    if (editingShipmentInvoice) {
        form.reset({
            comprobante: editingShipmentInvoice.comprobante,
            forma_pago: editingShipmentInvoice.forma_pago,
            monto: editingShipmentInvoice.monto,
            state: editingShipmentInvoice.state,
            fecha_entrega: editingShipmentInvoice.fecha_entrega ? new Date(editingShipmentInvoice.fecha_entrega).toISOString().split('T')[0] : null
        });
    }
    setSelectedFile(null);
  }, [editingShipmentInvoice, form]);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!isCameraDialogOpen) return;
      setHasCameraPermission(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast({ variant: 'destructive', title: 'Acceso a la cámara denegado' });
        closeCameraDialog();
      }
    };
    getCameraPermission();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isCameraDialogOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleEditInvoice = (invoice: ShipmentInvoice) => {
    handleGeofenceProtectedAction(invoice, (inv, location) => {
        setEditingShipmentInvoice({ ...inv, _capturedLocation: location });
        setIsInvoiceDialogOpen(true);
    });
  };

  const uploadComprobante = async (): Promise<string | undefined> => {
    if (selectedFile && editingShipmentInvoice?.comprobante) {
        const oldFileName = editingShipmentInvoice.comprobante.split('/').pop();
        if (oldFileName) await supabase.storage.from(BUCKET_NAME).remove([oldFileName]);
    }
    if (!selectedFile) return editingShipmentInvoice?.comprobante;
    setLoading(true);
    const fileName = `${Date.now()}-${selectedFile.name}`;
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });
    setLoading(false);
    if (error) {
      toast({ title: "Error al subir imagen", description: error.message, variant: "destructive" });
      return undefined;
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return publicUrl;
  };

  const recalculateAndSaveShipmentTotals = async (shipmentId: string) => {
    const { data: shipmentInvoicesData, error: shipmentInvoicesError } = await supabase
      .from('facturacion_x_despacho')
      .select('monto, facturacion(net_to_pay, code_customer, customer(id_impuesto, tipo_impuesto(impt_desc)))')
      .eq('id_despacho', shipmentId);
  
    if (shipmentInvoicesError) return;
  
    let totalContado = 0;
    let totalCredito = 0;
    let totalGeneral = 0;
  
    shipmentInvoicesData.forEach(inv => {
      // @ts-ignore
      const taxDesc = inv.facturacion?.customer?.tipo_impuesto?.impt_desc;
      if (taxDesc === 'Consumidor Final') totalContado += inv.monto || 0;
      else if (taxDesc === 'Crédito Fiscal') totalCredito += inv.monto || 0;
      // @ts-ignore
      totalGeneral += inv.facturacion?.net_to_pay || 0;
    });
  
    await supabase.from('despacho').update({ total_contado: totalContado, total_credito: totalCredito, total_general: totalGeneral }).eq('id_despacho', shipmentId);
  };

  const handleUpdateInvoice = async (values: ShipmentInvoiceEditValues) => {
    if (!editingShipmentInvoice) return;
    const imageUrl = await uploadComprobante();
    if (!imageUrl && selectedFile) return;

    // Lógica de auto-completado mejorada:
    // Si hay una imagen (nueva o vieja) y el monto es mayor a 0, se marca como pagado automáticamente.
    const isCompleted = values.state || (!!imageUrl && values.monto > 0);

    const dataToUpdate: any = { 
        comprobante: imageUrl, 
        forma_pago: values.forma_pago, 
        monto: values.monto, 
        state: isCompleted 
    };

    if (selectedFile) {
        dataToUpdate.fecha_entrega = new Date().toISOString();
        if (editingShipmentInvoice._capturedLocation) {
            const { latitude, longitude } = editingShipmentInvoice._capturedLocation;
            await supabase.from('customer').update({ last_known_location: `POINT(${longitude} ${latitude})` }).eq('code_customer', editingShipmentInvoice.code_customer);
        }
    }
    const { error } = await supabase.from('facturacion_x_despacho').update(dataToUpdate).eq('id_fac_desp', editingShipmentInvoice.id_fac_desp);
    if (error) toast({ title: "Error al actualizar", variant: "destructive" });
    else {
      toast({ title: "Éxito" });
      if (shipment) await recalculateAndSaveShipmentTotals(shipment.id_despacho);
      fetchData();
      closeInvoiceDialog();
    }
  };

  const handleCreateAndAssignInvoice = async (values: NewInvoiceInShipmentValues) => {
    if (!shipment) return;
    setLoading(true);
    try {
      const { data: customer, error: customerError } = await supabase.from('customer').select('id_term').eq('code_customer', values.code_customer).single();
      if (customerError) throw new Error("No se pudo obtener detalles del cliente.");
      const { data: term } = await supabase.from('terminos_pago').select('term_desc').eq('id_term', customer.id_term).single();
      const termDesc = term?.term_desc || "N/A";

      const { error: insertInvoiceError } = await supabase.from('facturacion').insert({
        id_factura: values.id_factura,
        reference_number: values.id_factura,
        code_customer: values.code_customer,
        customer_name: values.customer_name,
        tax_id_number: '0',
        subtotal: values.grand_total,
        total_sale: 0,
        grand_total: values.grand_total,
        payment: 0,
        net_to_pay: values.grand_total,
        term_description: termDesc,
        fecha: new Date().toISOString().split('T')[0],
        fecha_import: new Date().toISOString(),
        state: false,
        ruta: values.ruta,
      });

      if (insertInvoiceError) throw new Error(`Error al crear factura: ${insertInvoiceError.message}`);

      const { error: assignError } = await supabase.from('facturacion_x_despacho').insert({
        id_despacho: parseInt(shipment.id_despacho, 10),
        id_factura: values.id_factura,
        monto: 0,
        state: false,
        forma_pago: 'Efectivo',
      });

      if (assignError) throw new Error(`Error al asignar factura: ${assignError.message}`);

      toast({ title: "Éxito", description: "Factura creada y asignada correctamente." });
      await recalculateAndSaveShipmentTotals(shipment.id_despacho);
      fetchData();
      setIsAddInvoiceDialogOpen(false);
      addInvoiceForm.reset();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveInvoiceFromShipment = async (idFacDesp: number) => {
    setLoading(true);
    const { error } = await supabase.from('facturacion_x_despacho').delete().eq('id_fac_desp', idFacDesp);
    if (error) {
        toast({ title: "Error", description: "No se pudo eliminar la factura del despacho.", variant: "destructive" });
    } else {
        toast({ title: "Factura eliminada", description: "La factura ha sido desvinculada de este despacho." });
        if (shipment) await recalculateAndSaveShipmentTotals(shipment.id_despacho);
        fetchData();
    }
    setLoading(false);
  };

  const saveCapturedPhoto = async () => {
    if (!capturedImage || !invoiceForCamera) return;
    setLoading(true);
    if (invoiceForCamera.comprobante) {
        const oldFileName = invoiceForCamera.comprobante.split('/').pop();
        if (oldFileName) await supabase.storage.from(BUCKET_NAME).remove([oldFileName]);
    }
    const response = await fetch(capturedImage);
    const blob = await response.blob();
    const fileName = `${Date.now()}-comprobante.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file, { upsert: false });
    if (uploadError) {
      setLoading(false);
      toast({ title: "Error al subir imagen", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    
    // Si se toma una foto y ya hay un monto asignado, marcar como pagado.
    const isCompleted = invoiceForCamera.state || (!!publicUrl && invoiceForCamera.monto > 0);

    const dataToUpdate: any = { 
        comprobante: publicUrl, 
        fecha_entrega: new Date().toISOString(),
        state: isCompleted
    };

    const { error: dbError } = await supabase.from('facturacion_x_despacho').update(dataToUpdate).eq('id_fac_desp', invoiceForCamera.id_fac_desp);
    if (invoiceForCamera._capturedLocation) {
      const { latitude, longitude } = invoiceForCamera._capturedLocation;
      await supabase.from('customer').update({ last_known_location: `POINT(${longitude} ${latitude})` }).eq('code_customer', invoiceForCamera.code_customer);
    }
    setLoading(false);
    if (dbError) toast({ title: "Error al guardar", variant: "destructive" });
    else {
      toast({ title: "Éxito" });
      if (shipment) await recalculateAndSaveShipmentTotals(shipment.id_despacho);
      fetchData();
      closeCameraDialog();
    }
  };
  
  const handleGeofenceProtectedAction = (invoice: ShipmentInvoice, onSuccess: (invoice: ShipmentInvoice, location: { latitude: number; longitude: number } | null) => void) => {
    const role = currentUser?.role?.toLowerCase() || '';
    // Roles restringidos por ubicación geográfica
    const isRestrictedRole = role.includes('motorista') || role.includes('auxiliar') || role.includes('reparto');
    const isAdmin = role.includes('admin');

    // Los administradores y roles de oficina (como Facturación) NO están restringidos por geocerca
    // para permitir correcciones desde la oficina.
    if (!isRestrictedRole || isAdmin) {
      onSuccess(invoice, null);
      return;
    }

    setVerifyingLocationInvoiceId(invoice.id_fac_desp);
    
    // Configuración optimizada de Geolocation para mayor precisión
    const geoOptions = { 
        enableHighAccuracy: true, 
        timeout: 15000, // Aumentado a 15s para dar tiempo al sensor
        maximumAge: 0   // Forzar una lectura fresca, no caché
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`GPS Accuracy: ${accuracy} meters`);

        if (invoice.geocerca) {
          const { data, error } = await supabase.rpc('is_user_in_client_geofence', { 
            user_latitude: latitude, 
            user_longitude: longitude, 
            p_code_customer: invoice.code_customer 
          });
          
          setVerifyingLocationInvoiceId(null);
          
          if (error) {
              toast({ title: "Error de servidor", description: "No se pudo verificar la ubicación contra la base de datos.", variant: "destructive" });
          } else if (data === true) {
              onSuccess(invoice, null);
          } else {
              toast({ 
                  title: "Acción no permitida", 
                  description: "Debe estar físicamente dentro de la geocerca del cliente para realizar esta acción.", 
                  variant: "destructive" 
              });
          }
        } else {
          // Si el cliente no tiene geocerca, permitimos pero guardamos la ubicación actual.
          setVerifyingLocationInvoiceId(null);
          onSuccess(invoice, { latitude, longitude });
        }
      },
      (error) => {
        setVerifyingLocationInvoiceId(null);
        let msg = "No se pudo obtener la ubicación.";
        if (error.code === 1) msg = "Por favor, active el permiso de GPS en su navegador.";
        if (error.code === 2) msg = "Señal de GPS no disponible. Intente en un lugar abierto.";
        if (error.code === 3) msg = "Tiempo de espera agotado al obtener ubicación.";
        
        toast({ title: "Error de ubicación", description: msg, variant: "destructive" });
      },
      geoOptions
    );
  };
  
  const parseGeofenceCentroid = (geofenceData: any): { lat: string; lng: string } | null => {
    if (!geofenceData) return null;
    let allPoints: { lng: number; lat: number }[] = [];
    const getPointsFromPolygonString = (polygonString: string): { lng: number; lat: number }[] => {
        const coordsMatch = polygonString.match(/\(\((.*)\)\)/);
        if (!coordsMatch || !coordsMatch[1]) return [];
        return coordsMatch[1].split(',').map(pair => {
            const [lng, lat] = pair.trim().split(' ').map(Number);
            return { lng, lat };
        }).filter(p => !isNaN(p.lng) && !isNaN(p.lat));
    };
    if (typeof geofenceData === 'object' && geofenceData.type === 'Polygon') {
        allPoints = geofenceData.coordinates[0].map((p: number[]) => ({ lng: p[0], lat: p[1] })).filter(p => !isNaN(p.lng) && !isNaN(p.lat));
    } else if (typeof geofenceData === 'string') {
        const wktString = geofenceData.toUpperCase();
        if (wktString.startsWith('GEOMETRYCOLLECTION')) {
            const polygonStrings = geofenceData.match(/POLYGON\s*\(\(.*?\)\)/gi) || [];
            polygonStrings.forEach(polyStr => allPoints.push(...getPointsFromPolygonString(polyStr)));
        } else if (wktString.startsWith('POLYGON')) allPoints = getPointsFromPolygonString(geofenceData);
    }
    if (allPoints.length === 0) return null;
    const centroid = allPoints.reduce((acc, point) => ({ lng: acc.lng + point.lng, lat: acc.lat + point.lat }), { lng: 0, lat: 0 });
    return { lng: String(centroid.lng / allPoints.length), lat: String(centroid.lat / allPoints.length) };
  };

  const getVisitOrder = async (): Promise<ShipmentInvoice[]> => {
    const hasManualOrder = invoices.some(inv => inv.orden_visita !== null);
    if (hasManualOrder) {
      const manuallyOrderedInvoices = [...invoices].sort((a, b) => (a.orden_visita || Infinity) - (b.orden_visita || Infinity));
      return [{ customer_name: 'Bodega (Partida)', id_fac_desp: -1 } as ShipmentInvoice, ...manuallyOrderedInvoices];
    }
    const waypointsWithCentroids = invoices.map(invoice => {
        const centroid = parseGeofenceCentroid(invoice.geocerca);
        return centroid ? { invoice, centroid } : null;
    }).filter((c): c is { invoice: ShipmentInvoice; centroid: { lat: string; lng: string } } => c !== null);
    if (waypointsWithCentroids.length === 0) return [];
    setIsOptimizingRoute(true);
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { setIsOptimizingRoute(false); return []; }
    const toApiLatLng = (latLng: { lat: number | string; lng: number | string }) => ({ location: { latLng: { latitude: Number(latLng.lat), longitude: Number(latLng.lng) } } });
    const requestBody = { travelMode: "DRIVE", routingPreference: "TRAFFIC_AWARE", origin: toApiLatLng(BODEGA_LOCATION), destination: toApiLatLng(BODEGA_LOCATION), intermediates: waypointsWithCentroids.map(w => toApiLatLng(w.centroid)), optimizeWaypointOrder: true };
    try {
      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "routes.optimizedIntermediateWaypointIndex" }, body: JSON.stringify(requestBody) });
      const data = await response.json();
      const waypointOrder: number[] = data.routes[0].optimizedIntermediateWaypointIndex || [];
      const orderedInvoices = waypointOrder.map(index => waypointsWithCentroids[index].invoice);
      return [{ customer_name: 'Bodega (Partida)', id_fac_desp: -1 } as ShipmentInvoice, ...orderedInvoices];
    } catch { return []; } finally { setIsOptimizingRoute(false); }
  };

  const handleExportRouteToMaps = async () => {
    const orderedInvoices = await getVisitOrder();
    if (orderedInvoices.length <= 1) return;
    const waypoints = orderedInvoices.slice(1).map(invoice => {
        const centroid = parseGeofenceCentroid(invoice.geocerca);
        return centroid ? `${centroid.lat},${centroid.lng}` : null;
    }).filter(Boolean) as string[];
    if (waypoints.length === 0) return;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${BODEGA_LOCATION.lat},${BODEGA_LOCATION.lng}&destination=${waypoints[waypoints.length - 1]}${waypoints.length > 1 ? `&waypoints=${waypoints.slice(0, -1).join('|')}` : ''}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleShowVisitOrder = async () => {
      const orderedInvoices = await getVisitOrder();
      if (orderedInvoices.length > 0) { setOrderedRoute(orderedInvoices); setIsOrderDialogOpen(true); }
  };

  const toggleShipmentState = async (newState: 'en_curso' | 'finalizado') => {
      if (!shipment) return;
      setLoading(true);
      if (newState === 'en_curso') {
        const { data: activeShipments } = await supabase.from('despacho').select('id_despacho').eq('id_motorista', shipment.id_motorista).eq('estado_recorrido', 'en_curso').neq('id_despacho', shipment.id_despacho);
        if (activeShipments && activeShipments.length > 0) {
          setLoading(false);
          toast({ title: "Acción no permitida", description: `Ya tiene un recorrido activo (#${activeShipments[0].id_despacho}).`, variant: "destructive" });
          return;
        }
      }
      const { error } = await supabase.from('despacho').update({ estado_recorrido: newState }).eq('id_despacho', shipment.id_despacho);
      setLoading(false);
      if (!error) {
          if (newState === 'en_curso') localStorage.setItem('active_shipment_id', shipment.id_despacho);
          else localStorage.removeItem('active_shipment_id');
          fetchData(); 
      }
  };

  const handleReorder = async (invoiceId: number, direction: 'up' | 'down') => {
        const currentIndex = sortedInvoices.findIndex(inv => inv.id_fac_desp === invoiceId);
        if (currentIndex === -1) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= sortedInvoices.length) return;
        const invoiceA = sortedInvoices[currentIndex];
        const invoiceB = sortedInvoices[targetIndex];
        const orderA = invoiceA.orden_visita ?? currentIndex;
        const orderB = invoiceB.orden_visita ?? targetIndex;
        setLoading(true);
        const { error: errorA } = await supabase.from('facturacion_x_despacho').update({ orden_visita: orderB }).eq('id_fac_desp', invoiceA.id_fac_desp);
        const { error: errorB } = await supabase.from('facturacion_x_despacho').update({ orden_visita: orderA }).eq('id_fac_desp', invoiceB.id_fac_desp);
        setLoading(false);
        if (!errorA && !errorB) fetchData();
    };

  const closeInvoiceDialog = () => { setIsInvoiceDialogOpen(false); setEditingShipmentInvoice(null); setSelectedFile(null); form.reset(); };
  const handleOpenImageModal = (imageUrl: string) => { setSelectedImage(imageUrl); setImageModalOpen(true); }
  const openCameraDialog = (invoice: ShipmentInvoice) => handleGeofenceProtectedAction(invoice, (inv, location) => { setInvoiceForCamera({ ...inv, _capturedLocation: location }); setIsCameraDialogOpen(true); });
  const closeCameraDialog = () => { setIsCameraDialogOpen(false); setInvoiceForCamera(null); setCapturedImage(null); if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); };
  const takePhoto = () => { if (videoRef.current && canvasRef.current) { canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight; canvasRef.current.getContext('2d')?.drawImage(videoRef.current, 0, 0); setCapturedImage(canvasRef.current.toDataURL('image/jpeg', 0.9)); } };
  const searchCustomers = useCallback(async (q: string) => { if (!q) return []; const { data } = await supabase.from('customer').select('code_customer, customer_name, ruta').or(`code_customer.ilike.%${q}%,customer_name.ilike.%${q}%`).limit(10); return (data || []).map(c => ({ value: c.code_customer, label: `${c.code_customer} - ${c.customer_name}` })); }, []);
  const handleCustomerChange = async (c: string) => { if (!c) { addInvoiceForm.setValue('customer_name', ''); addInvoiceForm.setValue('ruta', ''); return; } const { data } = await supabase.from('customer').select('customer_name, ruta').eq('code_customer', c).single(); if (data) { addInvoiceForm.setValue('code_customer', c); addInvoiceForm.setValue('customer_name', data.customer_name); addInvoiceForm.setValue('ruta', String(data.ruta || '')); } };
  const getRouteDescription = (rId: string) => routes.find(r => String(r.id_ruta) === String(rId))?.ruta_desc || rId;
  const getUserName = (uId: string) => users.find(u => String(u.id_user) === String(uId))?.name || uId;
  const formatDate = (ds: string) => new Date(`${ds}T00:00:00Z`).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const handleGeneratePdf = () => shipment && setPdfData(generateShipmentPDF(shipment, invoices, routes.find(r => r.id_ruta === shipment.id_ruta) || { ruta_desc: 'N/A' }, users.find(u => u.id_user === shipment.id_motorista) || { name: 'N/A' }, users.find(u => u.id_user === shipment.id_auxiliar) || { name: 'N/A' }));

  const sortedInvoices = useMemo(() => [...invoices].sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity)), [invoices]);
  const filteredAndSortedInvoices = useMemo(() => { if (!searchQuery) return sortedInvoices; const q = searchQuery.toLowerCase(); return sortedInvoices.filter(i => (i.customer_name?.toLowerCase() || '').includes(q) || i.code_customer?.toLowerCase().includes(q) || String(i.reference_number || '').toLowerCase().includes(q)); }, [sortedInvoices, searchQuery]);
  const { totalContadoCalculado, totalCreditoCalculado, totalGeneralCalculado } = useMemo(() => {
      const tc = invoices.filter(i => i.tax_type === 'Consumidor Final').reduce((acc, i) => acc + i.monto, 0);
      const tcr = invoices.filter(i => i.tax_type === 'Crédito Fiscal').reduce((acc, i) => acc + i.monto, 0);
      return { totalContadoCalculado: tc, totalCreditoCalculado: tcr, totalGeneralCalculado: tc + tcr };
  }, [invoices]);
  
  const isMotorista = currentUser?.role?.toLowerCase()?.includes('motorista');
  const isAuxiliar = currentUser?.role?.toLowerCase()?.includes('auxiliar');
  const isFacturacion = currentUser?.role?.toLowerCase()?.includes('facturacion');
  const isAdmin = currentUser?.role?.toLowerCase()?.includes('admin');

  if (loading && !shipment) return <p>Cargando detalles...</p>;
  if (!shipment) return <p>No encontrado.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><CardTitle>Detalle #{shipment.id_despacho}</CardTitle><CardDescription>Información y estado actual.</CardDescription></div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
              {(isMotorista || isAuxiliar) && (
                <>
                  {shipment.estado_recorrido === 'pendiente' && <Button onClick={() => toggleShipmentState('en_curso')} className="bg-green-600 hover:bg-green-700"><Play className="mr-2 h-4 w-4" /> Iniciar</Button>}
                  {shipment.estado_recorrido === 'en_curso' && <Button onClick={() => toggleShipmentState('finalizado')} className="bg-red-600 hover:bg-red-700"><Square className="mr-2 h-4 w-4" /> Finalizar</Button>}
                   <Button onClick={handleShowVisitOrder} variant="outline"><ListOrdered className="mr-2 h-4 w-4" /> Orden de Visita</Button>
                </>
              )}
              <Button variant="outline" onClick={handleExportRouteToMaps}><MapPin className="mr-2 h-4 w-4" /> Exportar a Maps</Button>
              <Button variant="outline" onClick={() => { handleGeneratePdf(); setIsPreviewOpen(true); }}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
              <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div><p className="text-xs text-muted-foreground">Ruta</p><p>{getRouteDescription(shipment.id_ruta)}</p></div>
            <div><p className="text-xs text-muted-foreground">Motorista</p><p>{getUserName(shipment.id_motorista)}</p></div>
            <div><p className="text-xs text-muted-foreground">Auxiliar</p><p>{getUserName(shipment.id_auxiliar)}</p></div>
            <div><p className="text-xs text-muted-foreground">Fecha</p><p>{formatDate(shipment.fecha_despacho)}</p></div>
            <div><p className="text-xs text-muted-foreground">T. Contado</p><p>${totalContadoCalculado.toFixed(2)}</p></div>
            <div><p className="text-xs text-muted-foreground">T. Crédito</p><p>${totalCreditoCalculado.toFixed(2)}</p></div>
            <div><p className="text-xs text-muted-foreground">Total General</p><p className="font-bold">${totalGeneralCalculado.toFixed(2)}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
         <CardHeader><CardTitle>Estado del Proceso</CardTitle></CardHeader>
         <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatusBadge checked={shipment.facturacion} text="Fact."/><StatusBadge checked={shipment.bodega} text="Bodega"/><StatusBadge checked={shipment.reparto} text="Reparto"/><StatusBadge checked={shipment.asist_admon} text="Asist."/><StatusBadge checked={shipment.gerente_admon} text="Gerente"/><StatusBadge checked={shipment.cobros} text="Cobros"/>
         </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div><CardTitle>Facturas</CardTitle><CardDescription>{isAdmin ? "Gestión de facturas del despacho." : "Listado de facturas asociadas."}</CardDescription></div>
              {isAdmin && <Button onClick={() => setIsAddInvoiceDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Agregar Factura</Button>}
            </div>
            <div className="relative pt-4"><Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-full sm:w-[350px]" /></div>
        </CardHeader>
        <CardContent>
            <div className="hidden md:block">
              <Table>
                  <TableHeader>
                      <TableRow>
                          {isFacturacion && <TableHead className="w-20">Orden</TableHead>}
                          <TableHead>Factura</TableHead><TableHead>Cliente</TableHead><TableHead>Geocerca</TableHead><TableHead>Foto</TableHead><TableHead>Entrega</TableHead><TableHead>Total</TableHead><TableHead>Pago</TableHead><TableHead>Monto</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredAndSortedInvoices.map((inv, idx) => (
                          <TableRow key={inv.id_fac_desp}>
                              {isFacturacion && <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => handleReorder(inv.id_fac_desp, 'up')}><ArrowUp /></Button><Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === invoices.length - 1} onClick={() => handleReorder(inv.id_fac_desp, 'down')}><ArrowDown /></Button></div></TableCell>}
                              <TableCell className="font-medium">{String(inv.reference_number || inv.id_factura)}</TableCell>
                              <TableCell>{inv.customer_name}<br/><span className="text-xs text-muted-foreground">{inv.code_customer}</span></TableCell>
                              <TableCell><Badge variant={inv.geocerca ? 'default' : 'outline'}>{inv.geocerca ? 'Sí' : 'No'}</Badge></TableCell>
                              <TableCell>{inv.comprobante ? <button onClick={() => handleOpenImageModal(inv.comprobante)}><Image src={inv.comprobante} alt="Foto" width={40} height={40} className="rounded object-cover" /></button> : 'N/A'}</TableCell>
                              <TableCell>{inv.fecha_entrega ? new Date(inv.fecha_entrega).toLocaleTimeString() : 'N/A'}</TableCell>
                              <TableCell>${(inv.net_to_pay ?? 0).toFixed(2)}</TableCell>
                              <TableCell>{inv.forma_pago}</TableCell>
                              <TableCell>${inv.monto.toFixed(2)}</TableCell>
                              <TableCell><Badge variant={inv.state ? 'default' : 'secondary'}>{inv.state ? "Pagado" : "Pendiente"}</Badge></TableCell>
                              <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                      {verifyingLocationInvoiceId === inv.id_fac_desp ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                          <>
                                            <Button variant="ghost" size="icon" onClick={() => handleEditInvoice(inv)}><Pencil /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => openCameraDialog(inv)}><Camera /></Button>
                                          </>
                                      )}
                                      {isAdmin && (
                                          <AlertDialog>
                                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="text-destructive" /></Button></AlertDialogTrigger>
                                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar del despacho?</AlertDialogTitle><AlertDialogDescription>La factura no se borrará del sistema, solo de este despacho.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveInvoiceFromShipment(inv.id_fac_desp)}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                          </AlertDialog>
                                      )}
                                  </div>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </div>
            <div className="md:hidden">
              <Accordion type="single" collapsible className="w-full">
                  {filteredAndSortedInvoices.map(inv => (
                      <AccordionItem value={`item-${inv.id_fac_desp}`} key={inv.id_fac_desp}>
                          <AccordionTrigger className="p-4 hover:no-underline"><div className="text-left"><p className="font-semibold">{String(inv.reference_number || inv.id_factura)}</p><p className="text-xs text-muted-foreground">{inv.customer_name}</p></div></AccordionTrigger>
                          <AccordionContent className="p-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div><p className="text-muted-foreground">GEOCERCA</p><Badge variant={inv.geocerca ? 'default' : 'outline'}>{inv.geocerca ? 'Sí' : 'No'}</Badge></div>
                                  <div><p className="text-muted-foreground">TOTAL</p><p className="font-bold">${(inv.net_to_pay ?? 0).toFixed(2)}</p></div>
                                  <div><p className="text-muted-foreground">PAGO</p><p>{inv.forma_pago}</p></div>
                                  <div><p className="text-muted-foreground">MONTO</p><p>${inv.monto.toFixed(2)}</p></div>
                              </div>
                              <div className="flex gap-2">
                                  {verifyingLocationInvoiceId === inv.id_fac_desp ? (
                                      <div className="flex-1 flex justify-center py-2"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                  ) : (
                                      <>
                                          <Button variant="outline" className="flex-1" onClick={() => handleEditInvoice(inv)}><Pencil className="mr-2"/>Editar</Button>
                                          <Button className="flex-1" onClick={() => openCameraDialog(inv)}><Camera className="mr-2"/>Foto</Button>
                                      </>
                                  )}
                                  {isAdmin && <Button variant="destructive" size="icon" onClick={() => handleRemoveInvoiceFromShipment(inv.id_fac_desp)}><Trash2/></Button>}
                              </div>
                          </AccordionContent>
                      </AccordionItem>
                  ))}
              </Accordion>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Orden de Visita</DialogTitle></DialogHeader>
          <ol className="list-decimal list-inside space-y-2">{orderedRoute.map(inv => <li key={inv.id_fac_desp}>{inv.customer_name} {inv.id_fac_desp > -1 && <span className="text-xs text-muted-foreground">(Fact: {String(inv.reference_number)})</span>}</li>)}</ol>
        </DialogContent>
      </Dialog>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Editar Factura</DialogTitle></DialogHeader>
          <Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit(handleUpdateInvoice)}>
              <FormItem><FormLabel>Comprobante</FormLabel><FormControl><Input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" /></FormControl></FormItem>
              <FormField control={form.control} name="forma_pago" render={({ field }) => (
                <FormItem><FormLabel>Forma de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FormItem>
              )}/>
              <FormField control={form.control} name="monto" render={({ field }) => (<FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl></FormItem>)}/>
              <FormField control={form.control} name="state" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><Select onValueChange={v => field.onChange(v === 'true')} value={String(field.value)}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="true">Completado</SelectItem><SelectItem value="false">Pendiente</SelectItem></SelectContent></Select></FormItem>)}/>
              <DialogFooter><Button type="submit" disabled={loading}>Guardar</Button></DialogFooter>
            </form></Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddInvoiceDialogOpen} onOpenChange={setIsAddInvoiceDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Nueva Facturación</DialogTitle></DialogHeader>
          <Form {...addInvoiceForm}><form onSubmit={addInvoiceForm.handleSubmit(handleCreateAndAssignInvoice)} className="space-y-4">
              <FormField control={addInvoiceForm.control} name="id_factura" render={({ field }) => (<FormItem><FormLabel>No. Factura</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>)}/>
              <FormField control={addInvoiceForm.control} name="code_customer" render={({ field }) => (<FormItem><FormLabel>Cliente</FormLabel><AsyncCombobox value={field.value} onValueChange={handleCustomerChange} loadOptions={searchCustomers}/></FormItem>)}/>
              <FormField control={addInvoiceForm.control} name="grand_total" render={({ field }) => (<FormItem><FormLabel>Total</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl></FormItem>)}/>
              <DialogFooter><Button type="submit" disabled={loading}>Crear y Asignar</Button></DialogFooter>
            </form></Form>
        </DialogContent>
      </Dialog>

      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}><DialogContent className="max-w-3xl"><Image src={selectedImage} alt="C" width={800} height={600} className="w-full h-auto rounded"/></DialogContent></Dialog>
      <Dialog open={isCameraDialogOpen} onOpenChange={closeCameraDialog}><DialogContent className="p-0 border-0 bg-black max-w-full h-full sm:h-auto sm:max-w-3xl flex flex-col">
          <div className="relative flex-1">{capturedImage ? <Image src={capturedImage} alt="C" layout="fill" className="object-contain" /> : <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />}
            <canvas ref={canvasRef} className="hidden" /><div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">{capturedImage ? (<><Button onClick={() => setCapturedImage(null)}>Reintentar</Button><Button onClick={saveCapturedPhoto}>Guardar</Button></>) : <button onClick={takePhoto} className="h-16 w-16 rounded-full border-4 border-white bg-white/30" />}</div>
            <Button variant="ghost" size="icon" onClick={closeCameraDialog} className="absolute top-4 right-4 text-white"><X/></Button>
          </div>
        </DialogContent></Dialog>
      {pdfData && <PdfPreviewModal isOpen={isPreviewOpen} setIsOpen={setIsPreviewOpen} pdfDataUri={pdfData.dataUri} fileName={pdfData.fileName} />}
    </div>
  )
}
