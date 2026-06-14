import path from "node:path";

export type SafeImageExtension = "jpg" | "png" | "webp" | "gif";

const MIME_BY_EXTENSION: Record<SafeImageExtension, Set<string>> = {
  jpg: new Set(["image/jpeg", "image/jpg"]),
  png: new Set(["image/png"]),
  webp: new Set(["image/webp"]),
  gif: new Set(["image/gif"]),
};

const EXTENSIONS_BY_FILE_SUFFIX: Record<string, SafeImageExtension> = {
  ".jpg": "jpg",
  ".jpeg": "jpg",
  ".png": "png",
  ".webp": "webp",
  ".gif": "gif",
};

export interface ValidImageUpload {
  ok: true;
  bytes: Buffer;
  extension: SafeImageExtension;
  mimeType: string;
}

export interface InvalidImageUpload {
  ok: false;
  message: string;
  reason: string;
}

interface ValidateImageUploadInput {
  file: File;
  maxSizeBytes: number;
  allowedExtensions: ReadonlySet<SafeImageExtension>;
  requireFileExtensionMatch?: boolean;
}

function detectExtension(bytes: Buffer): SafeImageExtension | null {
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";
  const isGif =
    bytes.length >= 6 &&
    (bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
      bytes.subarray(0, 6).toString("ascii") === "GIF89a");

  if (isJpeg) return "jpg";
  if (isPng) return "png";
  if (isWebp) return "webp";
  if (isGif) return "gif";

  return null;
}

export async function validateImageUpload(
  input: ValidateImageUploadInput,
): Promise<ValidImageUpload | InvalidImageUpload> {
  if (input.file.size <= 0) {
    return { ok: false, message: "Файл пустой.", reason: "empty_file" };
  }

  if (input.file.size > input.maxSizeBytes) {
    return { ok: false, message: "Файл слишком большой.", reason: "file_too_large" };
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const detectedExtension = detectExtension(bytes);

  if (!detectedExtension || !input.allowedExtensions.has(detectedExtension)) {
    return {
      ok: false,
      message: "Поддерживаются только безопасные файлы изображений разрешённых форматов.",
      reason: "image_magic_invalid",
    };
  }

  const allowedMimes = MIME_BY_EXTENSION[detectedExtension];
  if (!allowedMimes.has(input.file.type)) {
    return {
      ok: false,
      message: "MIME-тип файла не совпадает с его содержимым.",
      reason: "image_mime_mismatch",
    };
  }

  if (input.requireFileExtensionMatch) {
    const suffix = path.extname(input.file.name).toLowerCase();
    const claimedExtension = EXTENSIONS_BY_FILE_SUFFIX[suffix];

    if (claimedExtension !== detectedExtension) {
      return {
        ok: false,
        message: "Расширение файла не совпадает с его содержимым.",
        reason: "image_extension_mismatch",
      };
    }
  }

  return {
    ok: true,
    bytes,
    extension: detectedExtension,
    mimeType: [...allowedMimes][0],
  };
}
