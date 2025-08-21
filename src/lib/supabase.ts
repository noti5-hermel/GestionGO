import { createClient } from '@supabase/supabase-js'

// Obtiene la URL y la clave anónima de Supabase desde las variables de entorno.
// Es crucial que estas variables estén definidas en tu archivo .env.local o en la configuración de tu entorno de despliegue.
// NEXT_PUBLIC_ se asegura de que estas variables sean accesibles en el cliente (navegador).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Crea y exporta una única instancia del cliente de Supabase para ser utilizada en toda la aplicación.
// El '!' al final de las variables de entorno asegura a TypeScript que estos valores no serán nulos.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
