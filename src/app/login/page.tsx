
'use client'

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import crypto from "crypto"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const HMAC_SECRET_KEY = process.env.NEXT_PUBLIC_HMAC_SECRET_KEY;

function hashPassword(password: string): string {
  if (!HMAC_SECRET_KEY) {
    throw new Error("La clave secreta HMAC no está configurada en las variables de entorno.");
  }
  return crypto.createHmac('sha256', HMAC_SECRET_KEY).update(password).digest('hex');
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showFirstUserForm, setShowFirstUserForm] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const checkUsers = async () => {
      const { count, error } = await supabase
        .from('usuario')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error("Error al verificar usuarios:", error)
        return;
      }
      
      if (count === 0) {
        setShowFirstUserForm(true);
      }
    }
    checkUsers()
  }, [])

  const handleLogin = async () => {
    const { data, error } = await supabase
      .from('usuario')
      .select('contraseña')
      .eq('correo', email)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
      toast({
        title: "Error",
        description: "Ocurrió un error al intentar iniciar sesión.",
        variant: "destructive",
      })
      console.error("Error de Supabase:", error)
      return;
    }

    if (data) {
      const hashedPassword = hashPassword(password);
      if (hashedPassword === data.contraseña) {
        document.cookie = `user-session=true; path=/; max-age=3600`; // 1 hour session
        toast({
          title: "¡Éxito!",
          description: "¡Bienvenido!",
        })
        window.location.href = "/";
      } else {
        toast({
          title: "Error de autenticación",
          description: "Correo o contraseña incorrectos.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Error de autenticación",
        description: "Correo o contraseña incorrectos.",
        variant: "destructive",
      })
    }
  }

  const handleFirstUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
        toast({ title: "Error", description: "Todos los campos son requeridos.", variant: "destructive" });
        return;
    }
    
    const hashedPassword = hashPassword(password);
    
    const { error: roleError } = await supabase
      .from('rol')
      .upsert({ id_rol: 1, rol_desc: 'Administrador' }, { onConflict: 'id_rol' });

    if (roleError) {
        toast({ title: "Error al asegurar el rol", description: roleError.message, variant: "destructive" });
        return;
    }

    const { error } = await supabase
        .from('usuario')
        .insert([{ name, correo: email, contraseña: hashedPassword, id_rol: 1 }])
        .select()
        .single();
        
    if (error) {
        toast({ title: "Error al crear usuario", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "¡Bienvenido!", description: "Primer usuario administrador creado. Ahora puede iniciar sesión." });
        setShowFirstUserForm(false);
        setName("");
        setEmail("");
        setPassword("");
    }
  }

  if (showFirstUserForm) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
                <Image
                    src="/gestion-go.120Z.png"
                    alt="GestiónGo Logo"
                    width={80}
                    height={80}
                    className="h-20 w-20 mx-auto mb-4"
                    data-ai-hint="logo"
                />
                <CardTitle className="text-2xl">Crear Primer Usuario</CardTitle>
                <CardDescription>
                    No hay usuarios en el sistema. Cree el primer usuario administrador.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleFirstUserSubmit}>
                <CardContent className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Su nombre"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="nombre@ejemplo.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input 
                        id="password" 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <Button type="submit" className="w-full">
                    Crear Usuario Administrador
                </Button>
                </CardContent>
            </form>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <Image
                src="/gestion-go.120Z.png"
                alt="GestiónGo Logo"
                width={80}
                height={80}
                className="h-20 w-20 mx-auto mb-4"
                data-ai-hint="logo"
            />
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico y contraseña para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <div className="p-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Iniciar Sesión
            </Button>
          </div>
        </div>
        <CardFooter className="text-center text-sm">
          <div className="w-full">
            ¿No tienes una cuenta?{" "}
            <Link href="#" className="underline">
              Regístrate
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
