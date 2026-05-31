"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-zinc-950 group-[.toaster]:text-zinc-900 dark:group-[.toaster]:text-zinc-50 group-[.toaster]:border-zinc-200 dark:group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toaster]:text-zinc-500 dark:group-[.toaster]:text-zinc-400",
          actionButton:
            "group-[.toaster]:bg-indigo-600 group-[.toaster]:text-white",
          cancelButton:
            "group-[.toaster]:bg-zinc-100 dark:group-[.toaster]:bg-zinc-800 group-[.toaster]:text-zinc-500 dark:group-[.toaster]:text-zinc-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }