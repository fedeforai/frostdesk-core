'use client';

import { createContext, useContext } from 'react';

export type ToastHandler = (message: string, isError?: boolean) => void;

const ToastContext = createContext<ToastHandler | null>(null);

export function useToast(): ToastHandler | null {
  return useContext(ToastContext);
}

export function ToastProvider({
  onToast,
  children,
}: {
  onToast: ToastHandler;
  children: React.ReactNode;
}) {
  return (
    <ToastContext.Provider value={onToast}>
      {children}
    </ToastContext.Provider>
  );
}
