"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuthPageRecovery() {
  const router = useRouter();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;

      setVersion((current) => current + 1);
      router.refresh();
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  return version;
}
