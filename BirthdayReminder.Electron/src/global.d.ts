declare module 'react-dom/client' {
  import { ReactElement } from 'react'
  export function createRoot(container: Element): { render: (element: ReactElement) => void }
  export function hydrateRoot(container: Element, element: ReactElement): { render: (element: ReactElement) => void }
}

interface CSSPropertiesWithWebkit extends React.CSSProperties {
  WebkitAppRegion?: 'drag' | 'no-drag'
}
