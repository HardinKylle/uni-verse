import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // Back to sign-in rather than `/`, which would drop the writer into the
  // anonymous demo studio as if they were a new visitor.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
