export const reportReasons = [
  { value: "spam", label: "Спам" },
  { value: "abuse", label: "Оскорбления" },
  { value: "prohibited_content", label: "Запрещённый контент" },
  { value: "fraud", label: "Мошенничество" },
  { value: "rules_violation", label: "Нарушение правил" },
  { value: "other", label: "Другое" },
] as const;

export type ReportReasonValue = (typeof reportReasons)[number]["value"];

export function isReportReason(value: string): value is ReportReasonValue {
  return reportReasons.some((reason) => reason.value === value);
}

export function getReportReasonLabel(value: string) {
  return reportReasons.find((reason) => reason.value === value)?.label ?? value;
}
