import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function PaymentTermsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Términos de Pago</CardTitle>
            <CardDescription>Gestione los términos de pago para facturas.</CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Término
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Neto 30</TableCell>
              <TableCell>30</TableCell>
              <TableCell>Pago requerido en 30 días.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Neto 60</TableCell>
              <TableCell>60</TableCell>
              <TableCell>Pago requerido en 60 días.</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Pago Inmediato</TableCell>
              <TableCell>0</TableCell>
              <TableCell>Pago requerido al momento de la entrega.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-3</strong> de <strong>3</strong> términos.
        </div>
      </CardFooter>
    </Card>
  )
}
