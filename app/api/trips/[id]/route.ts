import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error } = await supabase.from("trips").delete().eq("id", id);

  if (error) {
    console.error("Delete failed:", error.message);
    return Response.json({ error: "Could not delete trip" }, { status: 500 });
  }

  return Response.json({ ok: true });
}