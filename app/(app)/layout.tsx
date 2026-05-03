import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import Navbar from "@/components/Navbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session) redirect("/login");

  await connectDB();
  const user = await User.findById(session.uid).select("fullName");
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar name={user.fullName} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
