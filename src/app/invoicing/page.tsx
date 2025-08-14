import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function InvoicingPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Facturación</CardTitle>
            <CardDescription>Cree y visualice facturas.</CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Factura
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">FACT-2024-001</TableCell>
              <TableCell>Juan Pérez</TableCell>
              <TableCell>2024-05-21</TableCell>
              <TableCell>$1,250.00</TableCell>
              <TableCell><Badge>Pagada</Badge></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">FACT-2024-002</TableCell>
              <TableCell>Maria García</TableCell>
              <TableCell>2024-05-20</TableCell>
              <TableCell>$800.50</TableCell>
              <TableCell><Badge variant="secondary">Pendiente</Badge></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">FACT-2024-003</TableCell>
              <TableCell>Carlos Rodriguez</TableCell>
              <TableCell>2024-05-19</TableCell>
              <TableCell>$3,500.00</TableCell>
              <TableCell><Badge variant="destructive">Vencida</Badge></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-3</strong> de <strong>3</strong> facturas.
        </div>
      </CardFooter>
    </Card>
  )
}
