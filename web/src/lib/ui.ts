import { buttonVariants } from '@/components/ui/button';

/**
 * Estilos de botón compartidos, derivados del propio `buttonVariants` de shadcn.
 *
 * Antes cada pantalla repetía su propio string ('inline-flex h-9 items-center…'), con
 * nueve copias que ya habían empezado a divergir. Acá el sistema de diseño es la única
 * fuente: si cambia `button.tsx`, cambian todos.
 *
 * Para botones nuevos, preferí el componente <Button> directamente. Estos helpers
 * existen para los <button>/<a> que necesitan el estilo sin el componente.
 */
export const btn = buttonVariants({ variant: 'outline' });
export const btnPrimary = buttonVariants({ variant: 'default' });
export const btnDestructive = buttonVariants({ variant: 'destructive' });
export const btnIcon = buttonVariants({ variant: 'ghost', size: 'icon' });

/** Botón de ícono chico, para las acciones dentro de filas de tabla. */
export const btnIconSm = buttonVariants({ variant: 'ghost', size: 'icon', className: 'h-8 w-8' });
