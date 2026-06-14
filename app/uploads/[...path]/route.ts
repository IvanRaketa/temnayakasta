import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  if (!segments?.length || segments.some((part) => part.includes(".."))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const requestedPath = path.join(uploadsRoot, ...segments);
  const safeRoot = path.resolve(uploadsRoot);
  const safePath = path.resolve(requestedPath);

  if (!safePath.startsWith(safeRoot + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(safePath).toLowerCase();
  const contentType = MIME_TYPES[ext];

  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const fileStat = await stat(safePath);

    if (!fileStat.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const file = await readFile(safePath);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(file.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
