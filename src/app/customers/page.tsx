import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function CustomersPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Gestione su base de clientes.</CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Juan Pérez</TableCell>
              <TableCell>juan.perez@example.com</TableCell>
              <TableCell>+1 234 567 890</TableCell>
              <TableCell><Badge>Activo</Badge></TableCell>
              <TableCell>2023-10-26</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Maria García</TableCell>
              <TableCell>maria.garcia@example.com</TableCell>
              <TableCell>+1 987 654 321</TableCell>
              <TableCell><Badge variant="secondary">Inactivo</Badge></TableCell>
              <TableCell>2023-09-15</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Carlos Rodriguez</TableCell>
              <TableCell>carlos.r@example.com</TableCell>
              <TableCell>+1 555 555 555</TableCell>
              <TableCell><Badge>Activo</Badge></TableCell>
              <TableCell>2024-01-05</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-3</strong> de <strong>3</strong> clientes.
        </div>
      </CardFooter>
    </Card>
  )
}
