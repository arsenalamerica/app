import clsx from 'clsx';
import type { HTMLAttributes } from 'react';
import { createElement, forwardRef } from 'react';
import styles from './Card.module.scss';

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div' | 'article' | 'aside';
};

export const Card = forwardRef<HTMLElement, CardProps>(
  ({ as = 'section', className, children, ...rest }, ref) =>
    createElement(
      as,
      { ...rest, ref, className: clsx(styles._, className) },
      children,
    ),
);

Card.displayName = 'Card';
