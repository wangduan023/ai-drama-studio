"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
  size?: "sm" | "default" | "lg"
  className?: string
  fullPage?: boolean
}

const sizeMap = {
  sm: "h-4 w-4",
  default: "h-8 w-8",
  lg: "h-12 w-12",
}

export function LoadingState({
  message = "加载中...",
  size = "default",
  className,
  fullPage = false,
}: LoadingStateProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullPage && "min-h-[50vh]",
        className
      )}
      data-testid="loading-state"
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("animate-spin text-primary", sizeMap[size])} />
      {message && (
        <p className="text-sm text-muted-foreground" data-testid="loading-message">
          {message}
        </p>
      )}
    </div>
  )

  return content
}

export function LoadingOverlay({
  message = "加载中...",
  size = "default",
}: Omit<LoadingStateProps, "fullPage" | "className">) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      data-testid="loading-overlay"
    >
      <LoadingState message={message} size={size} />
    </div>
  )
}

export function LoadingCard({
  message = "加载中...",
  size = "sm",
}: Omit<LoadingStateProps, "fullPage" | "className">) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 rounded-lg border bg-card"
      data-testid="loading-card"
    >
      <LoadingState message={message} size={size} />
    </div>
  )
}
