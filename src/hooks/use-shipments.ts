
'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Esquema de validación para el formulario de despacho.
const shipmentSchema = z.object({
  id_ruta: z.preprocess(
    (val) => String(val),
    z.string().min(1, "ID de ruta es requerido.")
  ),
  id_motorista: z.preprocess(
    (val) => String(val),
    z.string().min(1, { message: "ID de motorista es requerido." })
  ),
  id_auxiliar: z.preprocess(
    (val) => String(val),
    z.string().min(1, { message: "ID de auxiliar es requerido." })
  ),
  total_contado: z.coerce.number().min(0).optional(),
  total_credito: z.coerce.number().min(0).optional(),
  total_general: z.coerce.number().min(0).optional(),
  fecha_despacho: z.string().min(1, "La fecha es requerida."),
  facturacion: z.boolean().default(true),
  bodega: z.boolean().default(false),
  reparto: z.boolean().default(false),
  asist_admon: z.boolean().default(false),
  gerente_admon: z.boolean().default(false),
  cobros: z.boolean().default(false),
})

// Tipos de datos para la gestión de despachos.
export type Shipment = z.infer<typeof shipmentSchema> & { id_despacho: string }
export type Route = { id_ruta: string; ruta_desc: string }
export type User = { id_user: string; name: string }
interface UserSession {
  id: string;
  name: string;
  role: string;
}

export type ReviewRole = keyof Pick<Shipment, 'facturacion' | 'bodega' | 'reparto' | 'asist_admon' | 'gerente_admon' | 'cobros'>;

interface UseShipmentsProps {
  itemsPerPage: number;
}

export const useShipments = ({ itemsPerPage }: UseShipmentsProps) => {
  // Estados para gestionar los datos y la UI de la página.
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [motoristas, setMotoristas] = useState<User[]>([])
  const [auxiliares, setAuxiliares] = useState<User[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'today' | 'date'>('all');
  const [customDate, setCustomDate] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1);
  const [session, setSession] = useState<UserSession | null>(null);
  const { toast } = useToast()
  const [reviewFilter, setReviewFilter] = useState<'pending' | 'reviewed'>('pending');

  // Configuración del formulario con react-hook-form y Zod.
  const form = useForm<z.infer<typeof shipmentSchema>>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      id_ruta: "",
      id_motorista: "",
      id_auxiliar: "",
      total_contado: 0,
      total_credito: 0,
      total_general: 0,
      fecha_despacho: new Date().toISOString().split('T')[0],
      facturacion: true,
      bodega: false,
      reparto: false,
      asist_admon: false,
      gerente_admon: false,
      cobros: false,
    },
  })
  
  const getReviewRoleFromSession = (userRole: string): ReviewRole | null => {
    if (userRole.includes('motorista')) return 'reparto';
    if (userRole.includes('auxiliar')) return 'reparto';
    if (userRole.includes('facturacion')) return 'facturacion';
    if (userRole.includes('bodega')) return 'bodega';
    if (userRole.includes('reparto')) return 'reparto';
    if (userRole.includes('asist.admon')) return 'asist_admon';
    if (userRole.includes('gerente.admon')) return 'gerente_admon';
    if (userRole.includes('cobros')) return 'cobros';
    return null;
  };

  const applyFilters = () => {
    let baseShipments = [...shipments];
    
    if (session) {
      const userRole = session.role.toLowerCase();
      const reviewRole = getReviewRoleFromSession(userRole);

      if (userRole.includes('motorista') || userRole.includes('auxiliar')) {
        baseShipments = shipments.filter(s =>
          String(s.id_motorista) === String(session.id) ||
          String(s.id_auxiliar) === String(session.id)
        );
      }
      
      if (reviewRole && !(userRole.includes('motorista') || userRole.includes('auxiliar'))) {
        if (reviewFilter === 'pending') {
          baseShipments = shipments.filter(s => s[reviewRole] === false);
        } else {
          baseShipments = shipments.filter(s => s[reviewRole] === true);
        }
      }
    }

    let newFilteredShipments = [...baseShipments];
    if (filterType === 'today') {
        const today = new Date().toISOString().split('T')[0];
        newFilteredShipments = baseShipments.filter(s => s.fecha_despacho === today);
    } else if (filterType === 'date' && customDate) {
        newFilteredShipments = baseShipments.filter(s => s.fecha_despacho === customDate);
    }
    setFilteredShipments(newFilteredShipments);
    setCurrentPage(1);
  };
  
  useEffect(() => {
    try {
      const userSession = localStorage.getItem('user-session');
      if (userSession) {
        setSession(JSON.parse(userSession));
      }
    } catch (error) {
      console.error("Failed to parse user session from localStorage", error);
    }
  }, []);

  useEffect(() => {
    fetchShipments()
    fetchRoutes()
    fetchUsersByRole()
    fetchAllUsers()
  }, [])
  
  useEffect(() => {
    applyFilters();
  }, [shipments, filterType, customDate, session, reviewFilter]);

  useEffect(() => {
    if (editingShipment) {
      form.reset({
        ...editingShipment,
        id_ruta: String(editingShipment.id_ruta),
        id_motorista: String(editingShipment.id_motorista),
        id_auxiliar: String(editingShipment.id_auxiliar),
        fecha_despacho: editingShipment.fecha_despacho ? new Date(editingShipment.fecha_despacho).toISOString().split('T')[0] : '',
      })
    } else {
      form.reset({
        id_ruta: "",
        id_motorista: "",
        id_auxiliar: "",
        total_contado: 0,
        total_credito: 0,
        total_general: 0,
        fecha_despacho: new Date().toISOString().split('T')[0],
        facturacion: true,
        bodega: false,
        reparto: false,
        asist_admon: false,
        gerente_admon: false,
        cobros: false,
      })
    }
  }, [editingShipment, form])

  const fetchAllUsers = async () => {
    const { data, error } = await supabase.from('usuario').select('id_user, name');
    if (error) {
      toast({ title: "Error", description: `No se pudieron cargar los usuarios: ${error.message}`, variant: "destructive" });
    } else {
      setUsers(data || []);
    }
  }

  const fetchShipments = async () => {
    const { data, error } = await supabase.from('despacho').select('*').order('fecha_despacho', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los despachos.",
        variant: "destructive",
      })
    } else {
      setShipments(data as Shipment[])
    }
  }

  const fetchRoutes = async () => {
    const { data, error } = await supabase.from('rutas').select('id_ruta, ruta_desc');
    if (error) {
        toast({
            title: "Error",
            description: "No se pudieron cargar las rutas.",
            variant: "destructive",
        });
    } else if (data) {
        setRoutes(data);
    }
  };

  const fetchUsersByRole = async () => {
    const { data: motoristaRoles, error: motoristaRolesError } = await supabase
      .from('rol')
      .select('id_rol')
      .ilike('rol_desc', '%motorista%');

    if (motoristaRolesError) {
      toast({ title: "Error al buscar rol motorista", description: motoristaRolesError.message, variant: "destructive" });
    } else if (motoristaRoles && motoristaRoles.length > 0) {
      const motoristaRoleIds = motoristaRoles.map(r => r.id_rol);
      const { data: motoristasData, error: motoristasError } = await supabase
        .from('usuario')
        .select('id_user, name')
        .in('id_rol', motoristaRoleIds);

      if (motoristasError) {
        toast({ title: "Error al cargar motoristas", description: motoristasError.message, variant: "destructive" });
      } else {
        setMotoristas(motoristasData || []);
      }
    }

    const { data: auxiliarRoles, error: auxiliarRolesError } = await supabase
      .from('rol')
      .select('id_rol')
      .ilike('rol_desc', '%auxiliar%');

    if (auxiliarRolesError) {
      toast({ title: "Error al buscar rol auxiliar", description: auxiliarRolesError.message, variant: "destructive" });
    } else if (auxiliarRoles && auxiliarRoles.length > 0) {
      const auxiliarRoleIds = auxiliarRoles.map(r => r.id_rol);
      const { data: auxiliaresData, error: auxiliaresError } = await supabase
        .from('usuario')
        .select('id_user, name')
        .in('id_rol', auxiliarRoleIds);
      if (auxiliaresError) {
        toast({ title: "Error al cargar auxiliares", description: `No se pudieron cargar los auxiliares: ${auxiliaresError.message}`, variant: "destructive" });
      } else {
        setAuxiliares(auxiliaresData || []);
      }
    }
  }

  const onSubmit = async (values: z.infer<typeof shipmentSchema>) => {
    let error;

    const dataToSubmit = {
      id_ruta: values.id_ruta,
      id_motorista: values.id_motorista,
      id_auxiliar: values.id_auxiliar,
      fecha_despacho: values.fecha_despacho,
      facturacion: values.facturacion,
      bodega: values.bodega,
      reparto: values.reparto,
      asist_admon: values.asist_admon,
      gerente_admon: values.gerente_admon,
      cobros: values.cobros,
    };

    if (editingShipment) {
      const { error: updateError } = await supabase
        .from('despacho')
        .update(dataToSubmit)
        .eq('id_despacho', editingShipment.id_despacho)
        .select()
      error = updateError;
    } else {
       const { error: insertError } = await supabase
        .from('despacho')
        .insert([dataToSubmit])
        .select()
      error = insertError;
    }

    if (error) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: `Despacho ${editingShipment ? 'actualizado' : 'guardado'} correctamente.`,
      })
      fetchShipments()
      handleCloseDialog()
    }
  }

  const handleDelete = async (shipmentId: string) => {
    const { error } = await supabase
      .from('despacho')
      .delete()
      .eq('id_despacho', shipmentId)

    if (error) {
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar el despacho porque está asociado a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar el despacho.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Despacho eliminado correctamente.",
      })
      fetchShipments()
    }
  }
  
  const handleEdit = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingShipment(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingShipment(null);
    form.reset({
        id_ruta: "",
        id_motorista: "",
        id_auxiliar: "",
        total_contado: 0,
        total_credito: 0,
        total_general: 0,
        fecha_despacho: new Date().toISOString().split('T')[0],
        facturacion: true,
        bodega: false,
        reparto: false,
        asist_admon: false,
        gerente_admon: false,
        cobros: false,
    });
    setIsDialogOpen(false);
  }

  const getRouteDescription = (routeId: string) => {
    if (!routes || routes.length === 0) return routeId;
    return routes.find(route => String(route.id_ruta) === String(routeId))?.ruta_desc || routeId;
  }
  
  const getUserName = (userId: string) => {
    return users.find(user => String(user.id_user) === String(userId))?.name || userId;
  }
  
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
  const paginatedShipments = filteredShipments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterType('date');
    setCustomDate(e.target.value);
  }
  
  const isMotoristaOrAuxiliar = session?.role?.toLowerCase().includes('motorista') || session?.role?.toLowerCase().includes('auxiliar');
  const reviewRole = session?.role ? getReviewRoleFromSession(session.role.toLowerCase()) : null;

  return {
    shipments,
    filteredShipments,
    paginatedShipments,
    routes,
    motoristas,
    auxiliares,
    users,
    isDialogOpen,
    setIsDialogOpen,
    editingShipment,
    setEditingShipment,
    filterType,
    setFilterType,
    customDate,
    setCustomDate,
    currentPage,
    setCurrentPage,
    totalPages,
    form,
    applyFilters,
    handleCustomDateChange,
    handleEdit,
    handleDelete,
    onSubmit,
    handleOpenDialog,
    handleCloseDialog,
    getRouteDescription,
    getUserName,
    isMotoristaOrAuxiliar,
    reviewRole,
    reviewFilter,
    setReviewFilter
  }
}

    