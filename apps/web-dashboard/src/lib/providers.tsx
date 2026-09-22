'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 menit data dianggap fresh
            gcTime: 5 * 60 * 1000, // 5 menit cache garbage collector
            refetchOnWindowFocus: false, // Hindari query berlebih saat berpindah tab
            retry: (failureCount, error: any) => {
              // Hindari retry jika error berasal dari kesalahan client (4xx)
              const status = error?.response?.status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
