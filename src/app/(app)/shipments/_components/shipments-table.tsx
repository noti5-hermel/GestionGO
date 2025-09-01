
'use client'

import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
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
import { Pencil, Trash2, Eye, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { generateShipmentPDF } from "@/lib/generate-shipment-pdf"
import type { Shipment, User, Route } from "@/hooks/use-shipments"
import { useState } from "react"
import { PdfPreviewModal } from "@/components/pdf-preview-modal"


// Componente para mostrar un badge de estado de forma consistente.
const StatusBadge = ({ checked }: { checked: boolean }) => {
  return <Badge variant={checked ? "default" : "outline"}>{checked ? "OK" : "Pend."}</Badge>
}

type ReviewRole = keyof Pick<Shipment, 'facturacion' | 'bodega' | 'reparto' | 'asist_admon' | 'gerente_admon' | 'cobros'>;

interface ShipmentsTableProps {
  shipments: Shipment[];
  handleEdit: (shipment: Shipment) => void;
  handleDelete: (shipmentId: string) => void;
  getRouteDescription: (routeId: string) => string;
  getUserName: (userId: string) => string;
  isMotoristaOrAuxiliar?: boolean;
  reviewRole: ReviewRole | null;
  routes: Route[];
  users: User[];
}

export function ShipmentsTable({
  shipments,
  handleEdit,
  handleDelete,
  getRouteDescription,
  getUserName,
  isMotoristaOrAuxiliar,
  reviewRole,
  routes,
  users,
}: ShipmentsTableProps) {
  
  const canEdit = reviewRole || !isMotoristaOrAuxiliar;
  const canDelete = !isMotoristaOrAuxiliar && !reviewRole;
  const { toast } = useToast();

  const [pdfData, setPdfData] = useState<{ dataUri: string; fileName: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleGeneratePdf = async (shipment: Shipment) => {
    // 1. Obtener las facturas asociadas a este despacho
    const { data: shipmentInvoices, error: invoicesError } = await supabase
      .from('facturacion_x_despacho')
      .select('*')
      .eq('id_despacho', shipment.id_despacho);

    if (invoicesError) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas para el PDF.", variant: "destructive" });
      return;
    }

    // 2. Obtener detalles de las facturas (opcional, pero mejora el informe)
     const invoiceIds = shipmentInvoices.map(inv => inv.id_factura);
     let enrichedInvoices = [...shipmentInvoices];

     if (invoiceIds.length > 0) {
       const { data: invoicesData, error: facturasError } = await supabase
         .from('facturacion')
         .select('id_factura, invoice_number, grand_total')
         .in('id_factura', invoiceIds);

       if (facturasError) {
         toast({ title: "Advertencia", description: "No se pudieron cargar detalles de facturas para el PDF." });
       } else if (invoicesData) {
         const invoiceDetailsMap = new Map(invoicesData.map(i => [i.id_factura, { invoice_number: i.invoice_number, grand_total: i.grand_total }]));
         enrichedInvoices = shipmentInvoices.map(si => ({
           ...si,
           ...invoiceDetailsMap.get(si.id_factura),
         }));
       }
     }
    
    // 3. Obtener descripciones de ruta y nombres de usuario
    const route = routes.find(r => r.id_ruta === shipment.id_ruta) || { ruta_desc: 'N/A' };
    const motorista = users.find(u => u.id_user === shipment.id_motorista) || { name: 'N/A' };
    const auxiliar = users.find(u => u.id_user === shipment.id_auxiliar) || { name: 'N/A' };

    // 4. Llamar a la función de generación de PDF
    const pdfOutput = generateShipmentPDF(shipment, enrichedInvoices, route, motorista, auxiliar);
    setPdfData(pdfOutput);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <div className="w-full overflow-x-auto">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead>ID Despacho</TableHead>
              <TableHead>Ruta</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Auxiliar</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>T. Contado</TableHead>
              <TableHead>T. Crédito</TableHead>
              <TableHead>T. General</TableHead>
              <TableHead>Facturación</TableHead>
              <TableHead>Bodega</TableHead>
              <TableHead>Reparto</TableHead>
              <TableHead>Asist. Admon.</TableHead>
              <TableHead>Gerente Admon.</TableHead>
              <TableHead>Cobros</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((shipment) => (
              <TableRow key={shipment.id_despacho}>
                <TableCell className="font-medium">{shipment.id_despacho}</TableCell>
                <TableCell>{getRouteDescription(shipment.id_ruta)}</TableCell>
                <TableCell>{getUserName(shipment.id_motorista)}</TableCell>
                <TableCell>{getUserName(shipment.id_auxiliar)}</TableCell>
                <TableCell>{new Date(shipment.fecha_despacho).toLocaleDateString()}</TableCell>
                <TableCell>${shipment.total_contado.toFixed(2)}</TableCell>
                <TableCell>${shipment.total_credito.toFixed(2)}</TableCell>
                <TableCell>${shipment.total_general.toFixed(2)}</TableCell>
                <TableCell><StatusBadge checked={shipment.facturacion} /></TableCell>
                <TableCell><StatusBadge checked={shipment.bodega} /></TableCell>
                <TableCell><StatusBadge checked={shipment.reparto} /></TableCell>
                <TableCell><StatusBadge checked={shipment.asist_admon} /></TableCell>
                <TableCell><StatusBadge checked={shipment.gerente_admon} /></TableCell>
                <TableCell><StatusBadge checked={shipment.cobros} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/shipments/${shipment.id_despacho}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleGeneratePdf(shipment)}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(shipment)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente el despacho.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(shipment.id_despacho)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pdfData && (
        <PdfPreviewModal
          isOpen={isPreviewOpen}
          setIsOpen={setIsPreviewOpen}
          pdfDataUri={pdfData.dataUri}
          fileName={pdfData.fileName}
        />
      )}
    </>
  )
}
