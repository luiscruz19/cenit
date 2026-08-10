"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Notificaciones flotantes. Reemplazan a los mensajes inline que quedaban colgados
 * arriba de cada pantalla: aparecen, avisan y se van solas, sin mover el layout.
 *
 * El tema no se pasa por prop porque la app resuelve claro/oscuro con clases de
 * Tailwind, no con next-themes: los estilos van por `toastOptions` con tokens propios.
 */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    className="toaster group"
    position="bottom-right"
    toastOptions={{
      classNames: {
        toast:
          "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
        description: "group-[.toast]:text-muted-foreground",
        actionButton:
          "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
        cancelButton:
          "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        success: "group-[.toaster]:border-emerald-500/30",
        error: "group-[.toaster]:border-destructive/40",
      },
    }}
    {...props}
  />
)

export { Toaster }
