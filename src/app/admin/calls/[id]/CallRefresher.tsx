"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface CallRefresherProps {
  isPlaceholder: boolean;
}

export default function CallRefresher({ isPlaceholder }: CallRefresherProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isPlaceholder) return;

    // Refresh the server component's data every 2 seconds
    const interval = setInterval(() => {
      router.refresh();
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaceholder, router]);

  return null;
}
