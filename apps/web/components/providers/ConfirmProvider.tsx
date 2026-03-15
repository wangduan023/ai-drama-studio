'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

interface ConfirmState {
  isOpen: boolean
  options: ConfirmOptions | null
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    options: null,
  })

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({
      isOpen: true,
      options,
    })
  }, [])

  const handleClose = useCallback(() => {
    setState({
      isOpen: false,
      options: null,
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.options?.onConfirm()
    handleClose()
  }, [state.options, handleClose])

  const handleCancel = useCallback(() => {
    state.options?.onCancel?.()
    handleClose()
  }, [state.options, handleClose])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={state.isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">
              {state.options?.title || '确认操作'}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {state.options?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 sm:justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 sm:flex-none"
            >
              {state.options?.cancelText || '取消'}
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none"
            >
              {state.options?.confirmText || '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (context === undefined) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}
