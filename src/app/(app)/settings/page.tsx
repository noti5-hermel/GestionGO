

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PaymentTerms from "./_components/payment-terms"
import Taxes from "./_components/taxes"

export default function SettingsPage() {
  return (
    <Tabs defaultValue="payment-terms" className="flex flex-col h-full">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="payment-terms">Términos de Pago</TabsTrigger>
          <TabsTrigger value="taxes">Impuestos</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="payment-terms" className="flex-1 overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Términos de Pago</CardTitle>
            <CardDescription>Gestione los términos de pago para facturas.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <PaymentTerms />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="taxes" className="flex-1 overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Impuestos</CardTitle>
            <CardDescription>Gestione los impuestos aplicables.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <Taxes />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
