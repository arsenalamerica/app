import './404.scss';

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';

import notFound from './404.jpeg';

export const metadata: Metadata = {
  title: 'Not Found',
};

export default async function NotFound() {
  const h = await headers();
  const host = h.get('host') ?? 'unknown';
  const pathname = h.get('x-pathname') ?? '(unknown path)';
  console.warn(`[404] ${host}${pathname}`);
  return <Image src={notFound} alt='Not Found' />;
}
