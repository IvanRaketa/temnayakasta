const externalProtocols = new Set(["http:", "https:"]);

export type AdTargetValidationResult =
  | { ok: true; targetUrl: string; isExternal: boolean }
  | { ok: false; message: string };

export function validateAdTargetUrl(value: unknown): AdTargetValidationResult {
  const targetUrl = String(value ?? "").trim();

  if (!targetUrl) {
    return { ok: false, message: "Укажите ссылку для перехода." };
  }

  if (targetUrl.startsWith("/")) {
    if (targetUrl.startsWith("//") || targetUrl.includes("\\")) {
      return { ok: false, message: "Внутренняя ссылка должна начинаться с одного символа /." };
    }

    return { ok: true, targetUrl, isExternal: false };
  }

  try {
    const url = new URL(targetUrl);

    if (!externalProtocols.has(url.protocol)) {
      return { ok: false, message: "Разрешены только http, https или внутренняя ссылка /..." };
    }

    return { ok: true, targetUrl: url.toString(), isExternal: true };
  } catch {
    return { ok: false, message: "Укажите корректную ссылку." };
  }
}

export function isExternalAdUrl(value: string) {
  const validation = validateAdTargetUrl(value);
  return validation.ok && validation.isExternal;
}

export function getSafeAdRedirectUrl(targetUrl: string, erid?: string | null) {
  const validation = validateAdTargetUrl(targetUrl);
  if (!validation.ok) return null;
  if (!validation.isExternal) return validation.targetUrl;

  const url = new URL(validation.targetUrl);
  const cleanErid = erid?.trim();

  if (cleanErid && !url.searchParams.has("erid")) {
    url.searchParams.set("erid", cleanErid);
  }

  return url.toString();
}
