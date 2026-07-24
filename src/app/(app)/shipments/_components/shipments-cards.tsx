
'use client'

import Link from "next/link"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Pencil, Trash2, Eye, FileText, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { generateShipmentPDF } from "@/lib/generate-shipment-pdf"
import type { Shipment, User, Route, ShipmentInvoice } from "@/hooks/use-shipments"
import { useState } from "react"
import { PdfPreviewModal } from "@/components/pdf-preview-modal"

const StatusBadge = ({ checked }: { checked: boolean }) => {
  return <Badge variant={checked ? "default" : "outline"}>{checked ? "OK" : "Pend."}</Badge>
}

type ReviewRole = keyof Pick<Shipment, 'facturacion' | 'bodega' | 'reparto' | 'asist_admon' | 'gerente_admon' | 'cobros'>;

interface ShipmentsCardsProps {
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

export function ShipmentsCards({
  shipments,
  handleEdit,
  handleDelete,
  getRouteDescription,
  getUserName,
  isMotoristaOrAuxiliar,
  reviewRole,
  routes,
  users,
}: ShipmentsCardsProps) {

  const canEdit = reviewRole || !isMotoristaOrAuxiliar;
  const canDelete = !isMotoristaOrAuxiliar && !reviewRole;
  const { toast } = useToast();

  const [pdfData, setPdfData] = useState<{ dataUri: string; fileName: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00Z`);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const handleGeneratePdf = async (shipment: Shipment) => {
    const { data: shipmentInvoices, error: invoicesError } = await supabase
      .from('facturacion_x_despacho')
      .select('*')
      .eq('id_despacho', shipment.id_despacho);

    if (invoicesError) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas para el PDF.", variant: "destructive" });
      return;
    }

    let enrichedInvoices: ShipmentInvoice[] = [];
    const invoiceIds = shipmentInvoices.map(inv => inv.id_factura);

    if (invoiceIds.length > 0) {
      const { data: invoicesData, error: invoicesDetailsError } = await supabase.from('facturacion').select('id_factura, reference_number, code_customer, grand_total, customer_name').in('id_factura', invoiceIds);
      if (invoicesDetailsError) {
        toast({ title: "Error", description: "No se pudieron cargar los datos de facturas.", variant: "destructive" });
        return;
      }

      const customerCodes = invoicesData.map(inv => inv.code_customer);
      const { data: customersData, error: customersError } = await supabase.from('customer').select('code_customer, id_impuesto').in('code_customer', customerCodes);
      if (customersError) {
        toast({ title: "Error", description: "No se pudieron cargar los datos de clientes.", variant: "destructive" });
        return;
      }

      const taxIds = customersData.map(c => c.id_impuesto);
      const { data: taxesData, error: taxesError } = await supabase.from('tipo_impuesto').select('id_impuesto, impt_desc').in('id_impuesto', taxIds);
      if (taxesError) {
        toast({ title: "Error", description: "No se pudieron cargar los tipos de impuesto.", variant: "destructive" });
        return;
      }

      const taxMap = new Map(taxesData.map(t => [t.id_impuesto, t.impt_desc]));
      const customerTaxMap = new Map(customersData.map(c => [c.code_customer, taxMap.get(c.id_impuesto)]));
      const invoiceInfoMap = new Map(invoicesData.map(i => [i.id_factura, { reference_number: i.reference_number, code_customer: i.code_customer, grand_total: i.grand_total, customer_name: i.customer_name }]));

      enrichedInvoices = shipmentInvoices.map(si => {
        const invoiceInfo = invoiceInfoMap.get(si.id_factura);
        return {
          ...si,
          reference_number: invoiceInfo?.reference_number,
          customer_name: invoiceInfo?.customer_name,
          grand_total: invoiceInfo?.grand_total,
          tax_type: customerTaxMap.get(invoiceInfo?.code_customer || '')
        } as ShipmentInvoice;
      });
    }

    const route = routes.find(r => r.id_ruta === shipment.id_ruta) || { ruta_desc: 'N/A' };
    const motorista = users.find(u => u.id_user === shipment.id_motorista) || { name: 'N/A' };
    const auxiliar = users.find(u => u.id_user === shipment.id_auxiliar) || { name: 'N/A' };

    const pdfOutput = generateShipmentPDF(shipment, enrichedInvoices, route, motorista, auxiliar);
    setPdfData(pdfOutput);
    setIsPreviewOpen(true);
  };

  const reviewFields: { key: ReviewRole; label: string }[] = [
    { key: 'facturacion', label: 'Facturación' },
    { key: 'bodega', label: 'Bodega' },
    { key: 'reparto', label: 'Reparto' },
    { key: 'asist_admon', label: 'Asist. Admon.' },
    { key: 'gerente_admon', label: 'Gerente Admon.' },
    { key: 'cobros', label: 'Cobros' },
  ];

  return (
    <>
      <div className="flex flex-col gap-3">
        {shipments.map((shipment) => (
          <Collapsible key={shipment.id_despacho}>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">#{shipment.id_despacho}</span>
                    <span className="text-xs text-muted-foreground truncate">{getRouteDescription(shipment.id_ruta)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(shipment.fecha_despacho)}</span>
                    <span className="text-sm font-medium">${(shipment.total_general ?? 0).toFixed(2)}</span>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 border-t">
                  <div className="grid grid-cols-2 gap-3 py-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Motorista</span>
                      <p className="font-medium">{getUserName(shipment.id_motorista)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Auxiliar</span>
                      <p className="font-medium">{getUserName(shipment.id_auxiliar)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">T. Contado</span>
                      <p className="font-medium">${(shipment.total_contado ?? 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">T. Crédito</span>
                      <p className="font-medium">${(shipment.total_credito ?? 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-t">
                    {reviewFields.map(({ key, label }) => (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
                        <StatusBadge checked={shipment[key]} />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-3 border-t">
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
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
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
