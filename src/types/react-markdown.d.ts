declare module 'react-markdown' {
  import { ComponentType } from 'react';
  import { Components } from 'react-markdown/lib/ast-to-react';

  interface ReactMarkdownProps {
    children: string;
    components?: Partial<Components>;
    className?: string;
  }

  const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
} 
 