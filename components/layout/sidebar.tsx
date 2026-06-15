import { AdRouteGate } from "@/components/ads/ad-route-gate";
import { AdSlot } from "@/components/ads/ad-slot";
import { NavLink, type NavIconName } from "@/components/layout/nav-link";
import { canModerate, isAdmin } from "@/lib/auth/roles";
import { AdPlacement, type UserRole } from "@/lib/generated/prisma/client";

type SidebarUser = {
  role: UserRole;
  premiumUntil?: Date | null;
} | null;

type SidebarItem = {
  href: string;
  label: string;
  iconName: NavIconName;
  exact?: boolean;
  adminOnly?: boolean;
  moderatorOnly?: boolean;
};

const items: SidebarItem[] = [
  { href: "/", label: "Главная", iconName: "home", exact: true },
  { href: "/new", label: "Новое", iconName: "sparkles", exact: true },
  { href: "/popular", label: "Популярное", iconName: "newspaper", exact: true },
  { href: "/feed/following", label: "Подписки", iconName: "newspaper" },
  { href: "/create", label: "Создать", iconName: "squarePen", exact: true },
  { href: "/profile", label: "Профиль", iconName: "user" },
  { href: "/premium", label: "Premium", iconName: "crown", exact: true },
  { href: "/admin", label: "Admin", iconName: "shield", adminOnly: true },
  { href: "/moderation", label: "Модерация", iconName: "shield", moderatorOnly: true },
];

export function Sidebar({ currentUser }: { currentUser: SidebarUser }) {
  const visibleItems = items.filter((item) => {
    if (item.adminOnly) return isAdmin(currentUser);
    if (item.moderatorOnly) return canModerate(currentUser);
    return true;
  });

  return (
    <aside className="hidden md:block">
      <nav className="tk-glass sticky top-16 space-y-1 rounded-2xl p-1.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            iconName={item.iconName}
            exact={item.exact}
          />
        ))}
        <div className="pt-2">
          <AdRouteGate>
            <AdSlot placement={AdPlacement.SIDEBAR} currentUser={currentUser} compact />
          </AdRouteGate>
        </div>
      </nav>
    </aside>
  );
}
