import { Main } from '@/components';
export interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Main>
      <h1>Fixtures</h1>
      {children}
    </Main>
  );
}
