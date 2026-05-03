import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Photo } from "@/models/Photo";
import { handle, ok, fail, requireSession } from "@/lib/api";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 6;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return fail("No file uploaded", 400);

    if (!ALLOWED_TYPES.has(file.type)) return fail("Only JPG/PNG/WEBP allowed", 415);
    if (file.size > MAX_BYTES) return fail("File too large (max 5MB)", 413);

    await connectDB();

    const user = await User.findById(session.uid);
    if (!user) return fail("User not found", 404);
    if (user.photos.length >= MAX_PHOTOS) return fail(`Max ${MAX_PHOTOS} photos`, 400);

    const buf = Buffer.from(await file.arrayBuffer());
    const photo = await Photo.create({
      owner: user._id,
      contentType: file.type,
      size: buf.length,
      data: buf,
    });

    const url = `/api/photo/${String(photo._id)}`;
    user.photos.push(url);
    await user.save();

    return ok({ url, photos: user.photos });
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const { url } = await req.json().catch(() => ({ url: "" }));
    if (!url || typeof url !== "string") return fail("url required", 400);

    await connectDB();
    const user = await User.findById(session.uid);
    if (!user) return fail("User not found", 404);

    user.photos = user.photos.filter((p) => p !== url);
    await user.save();

    const match = url.match(/\/api\/photo\/([a-f0-9]{24})/i);
    if (match && mongoose.Types.ObjectId.isValid(match[1])) {
      await Photo.deleteOne({ _id: match[1], owner: user._id });
    }

    return ok({ photos: user.photos });
  });
}
