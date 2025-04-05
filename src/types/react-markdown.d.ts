declare module 'react-markdown' {
  import { ComponentType, ReactNode } from 'react';

  interface ReactMarkdownProps {
    children: string;
    components?: Record<string, ComponentType<any>>;
    className?: string;
  }

  const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
} 
 