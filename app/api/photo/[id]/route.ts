import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Photo } from "@/models/Photo";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    await connectDB();
    const photo = await Photo.findById(id);
    if (!photo) return new Response("Not found", { status: 404 });

    const raw = photo.data as unknown;
    let buf: Buffer;
    if (Buffer.isBuffer(raw)) {
      buf = raw;
    } else if (raw && typeof raw === "object" && "buffer" in (raw as object)) {
      buf = Buffer.from((raw as { buffer: ArrayBufferLike }).buffer);
    } else {
      buf = Buffer.from(raw as ArrayBufferLike);
    }

    const body = new Uint8Array(buf);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": photo.contentType || "application/octet-stream",
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[api/photo/:id]", e);
    return new Response("Internal error", { status: 500 });
  }
}
