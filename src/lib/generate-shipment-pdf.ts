
'use client'

import jsPDF from 'jspdf'
import 'jspdf-autotable'
import type { ShipmentInvoice } from '@/app/(app)/shipments/[id]/page'

// Define un tipo extendido para jsPDF si autotable no está en la definición oficial.
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

// Define los tipos de datos que la función recibirá.
// Esto mejora la legibilidad y previene errores.
type Shipment = {
  id_despacho: string;
  fecha_despacho: string;
  total_contado: number;
  total_credito: number;
  total_general: number;
}

type User = { name: string }
type Route = { ruta_desc: string }

/**
 * Genera un documento PDF para un informe de despacho y devuelve su data URI.
 * @param shipment - El objeto del despacho principal.
 * @param invoices - Un array de las facturas asociadas al despacho.
 * @param route - El objeto de la ruta.
 * @param motorista - El objeto del usuario motorista.
 * @param auxiliar - El objeto del usuario auxiliar.
 * @returns El contenido del PDF como un Data URI string.
 */
export const generateShipmentPDF = (
  shipment: Shipment,
  invoices: ShipmentInvoice[],
  route: Route,
  motorista: User,
  auxiliar: User
): { dataUri: string, fileName: string } => {
  // 1. Inicializa el documento PDF.
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const pageHeight = doc.internal.pageSize.height;
  let yPos = 20; // Posición vertical inicial en la página.

  // 2. Título del Documento
  doc.setFontSize(18);
  doc.text(`Informe de Despacho #${shipment.id_despacho}`, 14, yPos);
  yPos += 10;

  // 3. Información General del Despacho
  doc.setFontSize(12);
  doc.text(`Fecha: ${new Date(shipment.fecha_despacho).toLocaleDateString()}`, 14, yPos);
  yPos += 7;
  doc.text(`Ruta: ${route.ruta_desc}`, 14, yPos);
  yPos += 7;
  doc.text(`Motorista: ${motorista.name}`, 14, yPos);
  yPos += 7;
  doc.text(`Auxiliar: ${auxiliar.name}`, 14, yPos);
  yPos += 10;

  const fiscalCreditInvoices = invoices.filter(inv => inv.tax_type === 'Crédito Fiscal');
  const finalConsumerInvoices = invoices.filter(inv => inv.tax_type === 'Consumidor Final');
  const otherInvoices = invoices.filter(inv => inv.tax_type !== 'Crédito Fiscal' && inv.tax_type !== 'Consumidor Final');
  
  const generateInvoiceTable = (title: string, invoiceList: ShipmentInvoice[]) => {
      if (invoiceList.length === 0) return;

      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 5;
      doc.setFontSize(14);
      doc.text(title, 14, yPos);
      yPos += 8;

      const tableColumn = ["No. Factura", "Total Factura", "Forma de Pago", "Monto Pagado", "Estado"];
      const tableRows = invoiceList.map(inv => [
        String(inv.invoice_number || inv.id_factura),
        `$${(inv.grand_total || 0).toFixed(2)}`,
        inv.forma_pago,
        `$${inv.monto.toFixed(2)}`,
        inv.state ? "Pagado" : "Pendiente"
      ]);

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [3, 166, 166] }, // Color del encabezado
      });

      yPos = (doc as any).autoTable.previous.finalY + 10;
  }
  
  generateInvoiceTable("Facturas de Crédito Fiscal", fiscalCreditInvoices);
  generateInvoiceTable("Facturas de Consumidor Final", finalConsumerInvoices);
  generateInvoiceTable("Otras Facturas", otherInvoices);


  // Si el contenido excede la página, crea una nueva.
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }

  // 5. Resumen de Totales (Cálculos dinámicos)
  const totalContadoCalculado = finalConsumerInvoices
    .reduce((acc, inv) => acc + inv.monto, 0);
  
  const totalCreditoCalculado = fiscalCreditInvoices
    .reduce((acc, inv) => acc + (inv.grand_total || 0), 0);

  doc.setFontSize(14);
  doc.text("Resumen de Totales", 14, yPos);
  yPos += 10;

  doc.setFontSize(12);
  const totals = [
    { label: "Total Contado:", value: `$${totalContadoCalculado.toFixed(2)}` },
    { label: "Total Crédito:", value: `$${totalCreditoCalculado.toFixed(2)}` },
    { label: "Total General:", value: `$${shipment.total_general.toFixed(2)}` }
  ];

  totals.forEach(total => {
    doc.text(total.label, 14, yPos);
    doc.text(total.value, 60, yPos);
    yPos += 7;
  });

  // 6. Pie de Página
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 10);
  }
  
  // 7. Genera el data URI y el nombre del archivo.
  return {
    dataUri: doc.output('datauristring'),
    fileName: `despacho_${shipment.id_despacho}.pdf`
  };
};

    