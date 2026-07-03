import * as React from "react"

export function TooltipProvider({ children }: { children: React.ReactNode; delayDuration?: number }) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipTrigger({ children }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>
}

export function TooltipContent(props: React.ComponentPropsWithoutRef<"div"> & { side?: "top" | "right" | "bottom" | "left"; align?: "start" | "center" | "end"; hidden?: boolean }) {
  if (props) return null
  return null
}
