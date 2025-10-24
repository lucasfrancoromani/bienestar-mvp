import React, { createContext, useContext, useState, useMemo } from 'react';

type DockCtx = { hidden: boolean; hide: () => void; show: () => void; };
const Ctx = createContext<DockCtx | null>(null);
export function useDock() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDock fuera de DockProvider');
  return v;
}
export function DockProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, hide: () => setHidden(true), show: () => setHidden(false) }), [hidden]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
