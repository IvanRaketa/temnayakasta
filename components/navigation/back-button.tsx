"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BackButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.history.back()}>
      <ArrowLeft className="size-4" />
      Назад
    </Button>
  );
}
