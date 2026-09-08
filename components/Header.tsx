import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOut from "@/components/SignOut";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-neutral-200">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight text-neutral-900">
          Trip Planner
        </Link>

        <div className="flex items-center gap-5 text-sm">
          <Link href="/trips" className="text-neutral-600 hover:text-neutral-900">
            Saved trips
          </Link>
          {user ? (
            <SignOut />
          ) : (
            <Link href="/login" className="text-neutral-600 hover:text-neutral-900">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}