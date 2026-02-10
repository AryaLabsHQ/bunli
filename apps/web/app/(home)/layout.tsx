import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { RootProvider } from 'fumadocs-ui/provider/next';
import './home.css';
import { baseOptions } from '@/app/layout.config';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <HomeLayout {...baseOptions}>{children}</HomeLayout>
    </RootProvider>
  );
}
