
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PaymentTerms from "./_components/payment-terms"
import Taxes from "./_components/taxes"

export default function SettingsPage() {
  return (
    <Tabs defaultValue="payment-terms">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="payment-terms">Términos de Pago</TabsTrigger>
          <TabsTrigger value="taxes">Impuestos</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="payment-terms">
        <Card>
          <CardHeader>
            <CardTitle>Términos de Pago</CardTitle>
            <CardDescription>Gestione los términos de pago para facturas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <PaymentTerms />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="taxes">
        <Card>
          <CardHeader>
            <CardTitle>Impuestos</CardTitle>
            <CardDescription>Gestione los impuestos aplicables.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Taxes />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
