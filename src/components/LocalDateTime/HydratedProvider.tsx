'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

const HydratedContext = createContext(false);

export function HydratedProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return <HydratedContext value={hydrated}>{children}</HydratedContext>;
}

export function useHydrated() {
  return useContext(HydratedContext);
}
