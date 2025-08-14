
'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PlusCircle } from "lucide-react"

const paymentTermSchema = z.object({
  id: z.string().min(1, { message: "El ID del término es requerido." }),
  description: z.string().min(1, { message: "La descripción es requerida." }),
})

type PaymentTerm = z.infer<typeof paymentTermSchema>

const initialPaymentTerms: PaymentTerm[] = [
  { id: "Neto-30", description: "Pago requerido en 30 días." },
  { id: "Neto-60", description: "Pago requerido en 60 días." },
  { id: "Pago-Inmediato", description: "Pago requerido al momento de la entrega." },
]

export default function PaymentTermsPage() {
  const [terms, setTerms] = useState<PaymentTerm[]>(initialPaymentTerms)
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<PaymentTerm>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      id: "",
      description: "",
    },
  })

  const onSubmit = (values: PaymentTerm) => {
    setTerms([...terms, values])
    form.reset()
    setIsDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Términos de Pago</CardTitle>
            <CardDescription>Gestione los términos de pago para facturas.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Término
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Término de Pago</DialogTitle>
                <DialogDescription>
                  Complete los detalles para crear un nuevo término de pago.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Término</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Neto-15" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Pago requerido en 15 días." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Término</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Término</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.map((term) => (
              <TableRow key={term.id}>
                <TableCell className="font-medium">{term.id}</TableCell>
                <TableCell>{term.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{terms.length}</strong> de <strong>{terms.length}</strong> términos.
        </div>
      </CardFooter>
    </Card>
  )
}
