import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { getCurrentSessionReadOnly } from "@/lib/auth/session-read";
import { isPremiumActive } from "@/lib/premium";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Настройки профиля",
  description: "Аватар, bio, отображаемое имя, Premium-оформление и смена e-mail.",
};

function formatPremiumDate(date?: Date | null) {
  if (!date) return null;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function ProfileSettingsPage() {
  const current = await getCurrentSessionReadOnly();

  if (!current) {
    redirect("/login");
  }

  return (
    <ProfileSettingsForm
      user={{
        username: current.user.username,
        email: current.user.email,
        avatar: current.user.avatar,
        bio: current.user.bio,
        premiumActive: isPremiumActive(current.user),
        premiumUntilLabel: formatPremiumDate(current.user.premiumUntil),
        profile: current.user.profile
          ? {
              displayName: current.user.profile.displayName,
              avatar: current.user.profile.avatar,
              bio: current.user.profile.bio,
              premiumNameEffect: current.user.profile.premiumNameEffect,
            }
          : null,
      }}
    />
  );
}
