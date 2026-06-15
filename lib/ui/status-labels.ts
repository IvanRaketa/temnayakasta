const postStatusLabels: Record<string, string> = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликован",
  PENDING_REVIEW: "На проверке",
  HIDDEN: "Скрыт",
  BLOCKED: "Заблокирован",
};

const commentStatusLabels: Record<string, string> = {
  PUBLISHED: "Опубликован",
  PENDING_REVIEW: "На проверке",
  HIDDEN: "Скрыт",
  BLOCKED: "Заблокирован",
};

const userStatusLabels: Record<string, string> = {
  ACTIVE: "Активен",
  LIMITED: "Ограничен",
  MUTED: "Без права писать",
  BANNED: "Заблокирован",
};

const reportStatusLabels: Record<string, string> = {
  PENDING: "Ожидает проверки",
  REVIEWED: "Просмотрена",
  ACCEPTED: "Принята",
  REJECTED: "Отклонена",
};

const userRoleLabels: Record<string, string> = {
  USER: "Пользователь",
  MODERATOR: "Модератор",
  ADMIN: "Администратор",
};

const reportTargetTypeLabels: Record<string, string> = {
  POST: "Пост",
  COMMENT: "Комментарий",
  USER: "Пользователь",
};

export function getPostStatusLabel(status: string) {
  return postStatusLabels[status] ?? status;
}

export function getCommentStatusLabel(status: string) {
  return commentStatusLabels[status] ?? status;
}

export function getUserStatusLabel(status: string) {
  return userStatusLabels[status] ?? status;
}

export function getReportStatusLabel(status: string) {
  return reportStatusLabels[status] ?? status;
}

export function getUserRoleLabel(role: string) {
  return userRoleLabels[role] ?? role;
}

export function getReportTargetTypeLabel(type: string) {
  return reportTargetTypeLabels[type] ?? type;
}

export function getAnyStatusLabel(status: string) {
  return (
    postStatusLabels[status] ??
    commentStatusLabels[status] ??
    userStatusLabels[status] ??
    reportStatusLabels[status] ??
    status
  );
}
