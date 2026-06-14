import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border border-white/70 bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.16)] hover:bg-white/90 hover:shadow-[0_0_32px_rgba(255,255,255,0.22)] [.light_&]:border-black/80 [.light_&]:bg-black [.light_&]:text-white [.light_&]:shadow-[0_0_20px_rgba(0,0,0,0.12)] [.light_&]:hover:bg-black/90 [.light_&]:hover:shadow-[0_0_28px_rgba(0,0,0,0.16)]",
        secondary:
          "border border-border bg-secondary/80 text-secondary-foreground backdrop-blur hover:border-accent/45 hover:bg-secondary",
        ghost:
          "border border-transparent text-muted-foreground hover:border-border hover:bg-secondary/70 hover:text-foreground",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
