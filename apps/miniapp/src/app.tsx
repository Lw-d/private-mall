import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { useSessionStore } from './store/sessionStore';
import './app.css';

export default function App({ children }: PropsWithChildren) {
  const hydrateSession = useSessionStore((state) => state.hydrateSession);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  return children;
}
