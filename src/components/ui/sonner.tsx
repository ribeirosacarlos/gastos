"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// Sem next-themes no projeto - tema fixo claro, consistente com o resto do
// app (ver globals.css, sem dark mode implementado ainda).
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
