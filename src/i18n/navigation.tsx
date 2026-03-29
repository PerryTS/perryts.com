"use client";

import NextLink from "next/link";
import { useParams } from "next/navigation";
import { type ComponentProps } from "react";

export function Link({
  href,
  ...props
}: ComponentProps<typeof NextLink>) {
  const params = useParams();
  const locale = params?.locale as string || "en";
  const localizedHref =
    typeof href === "string" && href.startsWith("/")
      ? `/${locale}${href}`
      : href;
  return <NextLink href={localizedHref} {...props} />;
}
