"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ThemeMode = "dark" | "light" | "system";

const THEME_KEY = "temnaya-kasta:theme";
const COMPACT_KEY = "temnaya-kasta:compact";
const REDUCE_MOTION_KEY = "temnaya-kasta:reduce-motion";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyInterfaceSettings(theme: ThemeMode, compact: boolean, reduceMotion: boolean) {
  const root = document.documentElement;
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.classList.toggle("light", resolvedTheme === "light");
  root.classList.toggle("compact", compact);
  root.classList.toggle("reduce-motion", reduceMotion);
}

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const savedTheme = window.localStorage.getItem(THEME_KEY);
  return savedTheme === "light" || savedTheme === "system" || savedTheme === "dark" ? savedTheme : "dark";
}

function getStoredBoolean(key: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "true";
}

function ThemeButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tk-link-card flex min-h-24 flex-col items-start justify-between p-4 text-left",
        active && "border-primary/60 bg-primary/10 text-primary shadow-[0_0_18px_rgba(246,205,96,0.12)]",
      )}
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-md border border-border bg-background/35">
          {icon}
        </span>
        {active ? <Check className="size-4" /> : null}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export function InterfaceSettings() {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [compact, setCompact] = useState(() => getStoredBoolean(COMPACT_KEY));
  const [reduceMotion, setReduceMotion] = useState(() => getStoredBoolean(REDUCE_MOTION_KEY));

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    window.localStorage.setItem(COMPACT_KEY, String(compact));
    window.localStorage.setItem(REDUCE_MOTION_KEY, String(reduceMotion));
    applyInterfaceSettings(theme, compact, reduceMotion);
  }, [compact, reduceMotion, theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onSystemChange = () => applyInterfaceSettings("system", compact, reduceMotion);
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, [compact, reduceMotion, theme]);

  return (
    <Card className="tk-glass-strong">
      <CardHeader>
        <CardTitle>Интерфейс</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <ThemeButton
            active={theme === "dark"}
            label="Тёмная"
            icon={<Moon className="size-4" />}
            onClick={() => setTheme("dark")}
          />
          <ThemeButton
            active={theme === "light"}
            label="Светлая"
            icon={<Sun className="size-4" />}
            onClick={() => setTheme("light")}
          />
          <ThemeButton
            active={theme === "system"}
            label="Как в системе"
            icon={<Monitor className="size-4" />}
            onClick={() => setTheme("system")}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="tk-link-card flex items-center justify-between gap-4 p-4 text-sm">
            <span>
              <span className="block font-medium text-foreground">Компактный режим</span>
              <span className="text-muted-foreground">Чуть плотнее списки, кнопки и карточки.</span>
            </span>
            <input
              type="checkbox"
              checked={compact}
              onChange={(event) => setCompact(event.target.checked)}
              className="size-5 accent-primary"
            />
          </label>
          <label className="tk-link-card flex items-center justify-between gap-4 p-4 text-sm">
            <span>
              <span className="block font-medium text-foreground">Меньше анимации</span>
              <span className="text-muted-foreground">Отключает длинные переходы и эффекты.</span>
            </span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
              className="size-5 accent-primary"
            />
          </label>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setTheme("dark");
            setCompact(false);
            setReduceMotion(false);
          }}
        >
          Сбросить настройки интерфейса
        </Button>
      </CardContent>
    </Card>
  );
}
