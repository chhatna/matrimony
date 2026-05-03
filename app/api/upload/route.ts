import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { handle, ok, fail, requireSession } from "@/lib/api";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 6;

export async function POST(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return fail("No file uploaded", 400);

    if (!ALLOWED_TYPES.has(file.type)) return fail("Only JPG/PNG/WEBP allowed", 415);
    if (file.size > MAX_BYTES) return fail("File too large (max 5MB)", 413);

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const name = `${session.uid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf);
    const url = `/uploads/${name}`;

    await connectDB();
    const user = await User.findById(session.uid);
    if (!user) return fail("User not found", 404);
    if (user.photos.length >= MAX_PHOTOS) return fail(`Max ${MAX_PHOTOS} photos`, 400);
    user.photos.push(url);
    await user.save();

    return ok({ url, photos: user.photos });
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const { url } = await req.json().catch(() => ({ url: "" }));
    if (!url) return fail("url required", 400);
    await connectDB();
    const user = await User.findById(session.uid);
    if (!user) return fail("User not found", 404);
    user.photos = user.photos.filter((p) => p !== url);
    await user.save();
    return ok({ photos: user.photos });
  });
}
