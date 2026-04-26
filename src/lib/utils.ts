/**
 * Utilitaires partagés pour les composants shadcn/ui.
 *
 * POURQUOI cette fonction cn() ?
 * shadcn/ui génère des composants qui combinent des classes Tailwind conditionnelles.
 * `clsx` fusionne les classes (avec conditions), `tailwind-merge` résout les conflits
 * entre classes Tailwind (ex: bg-red-500 + bg-blue-500 → seule la dernière est conservée).
 * Sans tailwind-merge, les classes conflictuelles s'accumulent sans ordre garanti.
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Fusionne des classes CSS avec résolution des conflits Tailwind.
 *
 * Usage : cn("px-4 py-2", isActive && "bg-blue-500", className)
 * → Retourne une chaîne de classes CSS sans conflits.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
