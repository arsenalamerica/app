import clsx from 'clsx';
import styles from './Main.module.scss';

export interface MainProps {
  children?: React.ReactNode;
  className?: string;
}

export function Main({ children, className, ...rest }: MainProps) {
  return (
    <main {...rest} className={clsx(styles._, className)}>
      {children}
    </main>
  );
}
