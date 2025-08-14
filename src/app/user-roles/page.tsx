import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function UserRolesPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Roles de Usuario</CardTitle>
            <CardDescription>Gestione los roles y permisos de los usuarios.</CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Rol
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rol</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Permisos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Administrador</TableCell>
              <TableCell>Acceso total a todas las funciones.</TableCell>
              <TableCell>Crear, Leer, Actualizar, Borrar</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Gerente</TableCell>
              <TableCell>Acceso a reportes y gestión de equipos.</TableCell>
              <TableCell>Crear, Leer, Actualizar</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Operador</TableCell>
              <TableCell>Acceso limitado a funciones de despacho.</TableCell>
              <TableCell>Leer</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-3</strong> de <strong>3</strong> roles.
        </div>
      </CardFooter>
    </Card>
  )
}
