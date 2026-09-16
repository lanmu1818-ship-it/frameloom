// Modified for standalone community distribution; see NOTICE.
import React, { Suspense, lazy, type ComponentType, type ReactNode } from "react";

type LoaderResult<P> =
  | ComponentType<P>
  | {
      default: ComponentType<P>;
    };

type DynamicOptions<P> = {
  loading?: ComponentType<P> | (() => ReactNode);
  ssr?: boolean;
};

export default function dynamic<P extends object>(
  loader: () => Promise<LoaderResult<P>>,
  options: DynamicOptions<P> = {}
) {
  const Loading = options.loading;
  const DynamicLoadFailure = (props: P) =>
    Loading ? <Loading {...props} /> : null;

  const LazyComponent = lazy(async () => {
    try {
      const module = await loader();
      const component =
        typeof module === "function" ? module : module?.default;

      if (isLikelyReactComponent(component)) {
        return { default: component as ComponentType<P> };
      }

      console.error("[desktop-dynamic] Invalid dynamic component export", {
        resolvedType: typeof module,
        hasDefault:
          Boolean(module) &&
          typeof module === "object" &&
          "default" in module,
      });
      return { default: DynamicLoadFailure };
    } catch (error) {
      console.error("[desktop-dynamic] Failed to load dynamic component", error);
      return { default: DynamicLoadFailure };
    }
  });
  const LazyComponentWithProps = LazyComponent as unknown as ComponentType<P>;

  return function DynamicComponent(props: P) {
    const fallback = Loading ? <Loading {...props} /> : null;
    return (
      <Suspense fallback={fallback}>
        <LazyComponentWithProps {...props} />
      </Suspense>
    );
  };
}

function isLikelyReactComponent(value: unknown) {
  if (typeof value === "function") return true;
  return (
    Boolean(value) &&
    typeof value === "object" &&
    "$$typeof" in (value as Record<string, unknown>)
  );
}
