
'use client'

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarInset,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogOut } from 'lucide-react'

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  /**
   * Cierra la sesión del usuario eliminando la cookie de sesión
   * y redirigiendo a la página de inicio de sesión.
   */
  const handleLogout = () => {
    // Establece la fecha de expiración de la cookie a una fecha pasada para que el navegador la elimine.
    // SameSite=None y Secure son necesarios para que funcione correctamente en entornos de iframe como Firebase Studio.
    document.cookie = 'user-session=true; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure';
    // Redirige al usuario a la página de login.
    window.location.href = '/login';
  };

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary group-data-[state=collapsed]:hidden">GestiónGo</h1>
            <h1 className="text-2xl font-bold text-primary group-data-[state=expanded]:hidden">GG</h1>
          </div>
        </SidebarHeader>
        <div className="flex items-center justify-end p-2 group-data-[state=expanded]:-mt-8">
            <SidebarTrigger className="md:flex" />
        </div>
        <SidebarSeparator />
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter className="p-2">
          <div className="flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-sidebar-accent">
            <Avatar className="size-8">
              <AvatarImage src="https://placehold.co/40x40.png" alt="@user" data-ai-hint="profile picture" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[state=collapsed]:hidden">
              <span className="font-semibold text-sm">Usuario</span>
              <span className="text-xs text-muted-foreground">usuario@email.com</span>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto group-data-[state=collapsed]:hidden" onClick={handleLogout}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6 sticky top-0 z-10 shrink-0">
          <div className="flex-1 text-right">
            
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
