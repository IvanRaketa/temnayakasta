import { BadgeCheck, Castle, Gem, Lock, Mountain, Sprout, Trees, Waves } from "lucide-react";

import type { IslandStats } from "@/lib/profile/island";
import { cn } from "@/lib/utils";

const islandStages = [
  {
    level: 1,
    title: "Берег новичка",
    description: "Первый участок острова и место для первых публикаций.",
    icon: Sprout,
    tone: "gold",
    shape: "cove",
    position: "left-[15%] top-[56%]",
  },
  {
    level: 5,
    title: "Роща авторов",
    description: "Открывается, когда автор набирает устойчивый ритм.",
    icon: Trees,
    tone: "emerald",
    shape: "grove",
    position: "left-[22%] top-[30%]",
  },
  {
    level: 10,
    title: "Башня обсуждений",
    description: "Зона живых комментариев и постоянных читателей.",
    icon: Castle,
    tone: "cyan",
    shape: "harbor",
    position: "left-[42%] top-[50%]",
  },
  {
    level: 15,
    title: "Кристальный мыс",
    description: "Открывается для авторов с заметным откликом сообщества.",
    icon: Gem,
    tone: "violet",
    shape: "crystal",
    position: "left-[58%] top-[24%]",
  },
  {
    level: 20,
    title: "Высокие скалы",
    description: "Большой остров для зрелого профиля и сильной статистики.",
    icon: Mountain,
    tone: "amber",
    shape: "cliff",
    position: "left-[74%] top-[47%]",
  },
  {
    level: 25,
    title: "Архипелаг влияния",
    description: "Финальная область текущего сезона островов.",
    icon: BadgeCheck,
    tone: "gold",
    shape: "chain",
    position: "left-[87%] top-[21%]",
  },
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function getNextIsland(level: number) {
  return islandStages.find((stage) => stage.level > level) ?? null;
}

function IslandNode({
  stage,
  currentLevel,
}: {
  stage: (typeof islandStages)[number];
  currentLevel: number;
}) {
  const unlocked = currentLevel >= stage.level;
  const Icon = unlocked ? stage.icon : Lock;

  return (
    <div
      className={cn(
        "island-map__node",
        `island-map__node--${stage.tone}`,
        stage.position,
        unlocked ? "island-map__node--unlocked" : "island-map__node--locked",
      )}
    >
      <div className={cn("island-map__land", `island-map__land--${stage.shape}`)}>
        <Icon className="size-5" />
      </div>
      <div className="island-map__label">
        <p className="text-xs font-semibold text-foreground">{stage.title}</p>
        <p className="text-[11px] text-muted-foreground">ур. {stage.level}</p>
      </div>
      <span className="sr-only">
        {stage.title}: {unlocked ? "открыто" : `откроется на уровне ${stage.level}`}
      </span>
    </div>
  );
}

export function IslandMap({ stats }: { stats: IslandStats }) {
  const nextIsland = getNextIsland(stats.level);
  const unlockedCount = islandStages.filter((stage) => stats.level >= stage.level).length;

  return (
    <div className="island-map">
      <div className="island-map__header">
        <div>
          <p className="tk-kicker">
            <Waves className="size-3.5" />
            Карта островов
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            Открыто {unlockedCount}/{islandStages.length}
          </h2>
        </div>
        <div className="island-map__level">
          <span>уровень</span>
          <strong>{stats.level}</strong>
        </div>
      </div>

      <div className="island-map__canvas" aria-label="Карта островов профиля">
        <div className="island-map__route" />
        <div className="island-map__sea island-map__sea--a" />
        <div className="island-map__sea island-map__sea--b" />
        {islandStages.map((stage) => (
          <IslandNode key={stage.level} stage={stage} currentLevel={stats.level} />
        ))}
      </div>

      <div className="island-map__footer">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {nextIsland
              ? `Следующий остров: ${nextIsland.title}, уровень ${nextIsland.level}`
              : "Все острова текущего сезона открыты"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatNumber(stats.xp)} XP · до следующего уровня{" "}
            {formatNumber(Math.max(0, stats.nextLevelXp - stats.xp))} XP
          </p>
        </div>
        <div className="h-2 min-w-36 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${stats.levelProgressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
