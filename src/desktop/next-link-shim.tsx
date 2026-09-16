// Modified for standalone community distribution; see NOTICE.
import React from "react";
import { useRouter } from "@/src/desktop/next-navigation-shim";

type DesktopLinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  href: string | URL;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

export default function Link({
  href,
  onClick,
  replace = false,
  target,
  ...props
}: DesktopLinkProps) {
  const router = useRouter();
  const hrefString = href.toString();

  return (
    <a
      {...props}
      href={hrefString}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          target ||
          event.button !== 0 ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        ) {
          return;
        }

        const url = new URL(hrefString, window.location.origin);
        if (url.origin !== window.location.origin) {
          return;
        }

        event.preventDefault();
        if (replace) {
          router.replace(`${url.pathname}${url.search}${url.hash}`);
        } else {
          router.push(`${url.pathname}${url.search}${url.hash}`);
        }
      }}
    />
  );
}
