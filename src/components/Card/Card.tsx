import { Role, type RoleProps } from '@ariakit/react';
import clsx from 'clsx';
import { forwardRef } from 'react';
import styles from './Card.module.scss';

export type CardProps = RoleProps;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ render = <section />, className, children, ...rest }, ref) => {
    return (
      <Role
        {...rest}
        ref={ref}
        render={render}
        className={clsx(styles._, className)}
      >
        {children}
      </Role>
    );
  },
);

Card.displayName = 'Card';
