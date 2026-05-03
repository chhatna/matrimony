import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Interest } from "@/models/Interest";
import { getSession } from "@/lib/auth";
import ChatWindow from "./ChatWindow";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: { peerId: string } }) {
  const session = getSession()!;
  await connectDB();
  const peer = await User.findById(params.peerId).select("fullName photos city profession");
  if (!peer) notFound();

  const accepted = await Interest.findOne({
    status: "accepted",
    $or: [
      { from: session.uid, to: peer._id },
      { from: peer._id, to: session.uid },
    ],
  });
  if (!accepted) {
    redirect("/interests");
  }

  return (
    <ChatWindow
      peer={{
        _id: String(peer._id),
        fullName: peer.fullName,
        photo: peer.photos?.[0] || null,
        subtitle: [peer.profession, peer.city].filter(Boolean).join(" \u00b7 "),
      }}
    />
  );
}
