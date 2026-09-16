// Modified for standalone community distribution; see NOTICE.
import { cn } from "@/src/lib/utils";
import styles from "@/src/components/pacman-loader.module.css";

/** Decorative animation; the containing loading state supplies its status label. */
export function PacmanLoader({
  className,
  paused = false,
}: {
  className?: string;
  paused?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(styles.loader, className)}
      data-paused={paused || undefined}
    >
      <span className={styles.pacman} />
      <span className={styles.bean} />
      <span className={styles.bean} />
      <span className={styles.bean} />
      <span className={styles.bean} />
    </div>
  );
}
