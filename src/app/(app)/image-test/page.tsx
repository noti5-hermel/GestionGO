
'use client'

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Trash2 } from "lucide-react"
import Image from "next/image"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


// Define el tipo para un archivo de imagen en Supabase Storage.
// Cada imagen tendrá un nombre (que actúa como ID) y una URL pública para mostrarla.
interface ImageFile {
  name: string;
  url: string;
}

/**
 * Componente de página para probar la carga y visualización de imágenes
 * utilizando Supabase Storage.
 */
export default function ImageTestPage() {
  // --- ESTADOS ---
  // Almacena la lista de imágenes obtenidas del bucket de Supabase.
  const [images, setImages] = useState<ImageFile[]>([])
  // Almacena el archivo seleccionado por el usuario en el input de tipo 'file'.
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // Controla el estado de carga para deshabilitar botones y mostrar feedback al usuario.
  const [loading, setLoading] = useState(false)
  // Hook para mostrar notificaciones (toasts).
  const { toast } = useToast()
  // Referencia al elemento del input de archivo para poder interactuar con él programáticamente.
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Nombre del bucket en Supabase Storage donde se almacenarán las imágenes.
  const BUCKET_NAME = 'comprobante'

  // --- EFECTOS ---
  // Se ejecuta una vez cuando el componente se monta para cargar la lista inicial de imágenes.
  useEffect(() => {
    fetchImages();
  }, []);


  // --- FUNCIONES ---

  /**
   * Obtiene la lista de archivos del bucket de Supabase Storage, construye sus URLs públicas
   * y actualiza el estado 'images'.
   */
  const fetchImages = async () => {
    setLoading(true);
    // 1. Llama a Supabase para listar los archivos en el bucket especificado.
    const { data: fileList, error } = await supabase.storage.from(BUCKET_NAME).list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }, // Ordena para mostrar los más recientes primero.
    });

    if (error) {
      // Si hay un error, muestra una notificación destructiva.
      // Este error suele ocurrir si las políticas de seguridad (RLS) del bucket no permiten la operación 'select'.
      toast({
        title: "Error al cargar imágenes",
        description: `No se pudieron listar los archivos. Asegúrate de que el bucket '${BUCKET_NAME}' exista y tenga las políticas de seguridad (RLS) correctas para la operación 'select'.`,
        variant: "destructive",
      });
      console.error("Error fetching images:", error.message);
    } else if (fileList) {
      // 2. Si la lista de archivos se obtiene correctamente, mapea cada archivo.
      const imageUrls = fileList.map(file => {
        // 3. Para cada archivo, obtiene su URL pública. Esta URL puede ser usada en etiquetas <img>.
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
        return { name: file.name, url: data.publicUrl };
      });
      // 4. Actualiza el estado con la lista de imágenes y sus URLs.
      setImages(imageUrls);
    }
    setLoading(false);
  };
  

  /**
   * Manejador para el evento 'onChange' del input de archivo.
   * Captura el archivo seleccionado por el usuario y lo guarda en el estado 'selectedFile'.
   * @param event El evento del cambio del input.
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  /**
   * Sube el archivo seleccionado al bucket de Supabase Storage.
   */
  const handleUpload = async () => {
    // Valida que se haya seleccionado un archivo.
    if (!selectedFile) {
      toast({ title: "Sin archivo", description: "Por favor, selecciona un archivo para subir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    // Genera un nombre de archivo único para evitar colisiones, anteponiendo la fecha actual.
    const fileName = `${Date.now()}-${selectedFile.name}`;
    
    // 1. Sube el archivo al bucket de Supabase.
    // Esta operación requiere que las políticas RLS del bucket permitan la operación 'insert'.
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, selectedFile, {
        cacheControl: '3600', // El archivo se mantendrá en caché por 3600 segundos.
        upsert: false, // Si un archivo con el mismo nombre existe, no lo sobreescribirá.
      });

    setLoading(false);
    
    if (error) {
      // El error "new row violates row-level security policy" es común aquí.
      toast({ title: "Error al subir", description: error.message, variant: "destructive" });
      console.error("Error uploading file:", error.message);
    } else {
      // Si la subida es exitosa, muestra una notificación de éxito.
      toast({ title: "Éxito", description: "Imagen subida correctamente." });
      setSelectedFile(null); // Limpia la selección de archivo.
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Resetea el input para poder seleccionar el mismo archivo de nuevo.
      }
      fetchImages(); // Recarga la lista de imágenes para mostrar la nueva.
    }
  };

  /**
   * Elimina un archivo del bucket de Supabase Storage.
   * @param fileName El nombre del archivo a eliminar.
   */
  const handleDelete = async (fileName: string) => {
    setLoading(true);
    // 1. Llama a Supabase para eliminar el archivo especificado.
    // Esta operación requiere que las políticas RLS del bucket permitan la operación 'delete'.
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName]);
    setLoading(false);

    if (error) {
        toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Éxito", description: "Imagen eliminada correctamente." });
        fetchImages(); // Recarga la lista de imágenes para reflejar la eliminación.
    }
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <Card className="h-full flex flex-col">
      {/* Cabecera de la tarjeta con título y descripción */}
      <CardHeader>
        <CardTitle>Prueba de Carga de Imágenes</CardTitle>
        <CardDescription>
          Sube imágenes a Supabase Storage y visualízalas. 
          Asegúrate de que el bucket `{BUCKET_NAME}` exista y que sus políticas de seguridad (RLS) permitan las operaciones de `select`, `insert`, y `delete` para los usuarios autenticados.
        </CardDescription>
      </CardHeader>
      
      {/* Contenido principal con el formulario de carga y la tabla */}
      <CardContent className="flex-1 overflow-auto space-y-6">
        {/* Sección del formulario para seleccionar y subir una imagen */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg">
          <Input
            type="file"
            ref={fileInputRef} // Asocia la referencia al input.
            onChange={handleFileChange}
            accept="image/*" // Limita la selección de archivos solo a imágenes.
            className="flex-1"
          />
          <Button onClick={handleUpload} disabled={loading || !selectedFile}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? 'Subiendo...' : 'Subir Imagen'}
          </Button>
        </div>

        {/* Tabla para mostrar las imágenes subidas */}
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vista Previa</TableHead>
                <TableHead>Nombre del Archivo</TableHead>
                <TableHead>URL Pública</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Muestra un mensaje de carga mientras se obtienen las imágenes */}
              {loading && images.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">Cargando imágenes...</TableCell>
                </TableRow>
              ) : images.length > 0 ? (
                // Mapea y renderiza cada imagen en una fila de la tabla
                images.map((image) => (
                  <TableRow key={image.name}>
                    <TableCell>
                      {/* Componente Image de Next.js para optimización de imágenes */}
                      <Image
                        src={image.url}
                        alt={`Vista previa de ${image.name}`}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-md object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{image.name}</TableCell>
                    <TableCell>
                        <a href={image.url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                            Ver imagen
                        </a>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Botón de eliminar con diálogo de confirmación */}
                      <div className="flex justify-end items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente la imagen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(image.name)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Muestra un mensaje si no hay imágenes en el bucket
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No hay imágenes en el bucket.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {/* Pie de la tarjeta con el recuento de imágenes */}
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>{images.length}</strong> imágenes.
        </div>
      </CardFooter>
    </Card>
  )
}

    