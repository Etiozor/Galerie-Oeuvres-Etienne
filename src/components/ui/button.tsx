/**
 * Composant Button — variantes de bouton shadcn/ui.
 *
 * POURQUOI ce composant et pas un <button> HTML direct ?
 * Le design system définit 3 variantes (default, outline, destructive) utilisées
 * sur l'écran de validation. Ce composant garantit la cohérence visuelle et
 * les classes Tailwind correctes sans les dupliquer partout.
 *
 * Construit sur @radix-ui/react-slot pour supporter le pattern asChild
 * (ex: <Button asChild><Link href="...">...</Link></Button>).
 */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Classes de base — communes à tous les boutons
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Bouton CTA primaire — fond sombre (#171717 via bg-primary), texte blanc
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Bouton secondaire — bordure, fond transparent
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        // Bouton destructif — rouge (#dc2626 via bg-destructive)
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Boutons supplémentaires (non utilisés dans cette phase)
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Délègue le rendu à l'enfant direct (ex: <Link>) au lieu d'un <button> */
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
