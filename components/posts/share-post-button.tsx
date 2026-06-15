"use client";

import { useMemo, useState } from "react";
import { Check, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SharePostButtonProps {
  title: string;
  url: string;
  className?: string;
  label?: string;
}

function getAbsoluteShareUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;

  if (typeof window === "undefined") return url;

  return new URL(url, window.location.origin).toString();
}

export function SharePostButton({
  title,
  url,
  className,
  label = "Поделиться",
}: SharePostButtonProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => getAbsoluteShareUrl(url), [url]);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        console.error("Failed to share post.", error);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "tk-pill cursor-pointer transition hover:border-ring hover:text-foreground active:scale-[0.98]",
        copied && "border-primary/45 text-primary",
        className,
      )}
      aria-label={copied ? "Ссылка скопирована" : `Поделиться постом: ${title}`}
    >
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      <span>{copied ? "Скопировано" : label}</span>
    </button>
  );
}
