import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomePageClient from "@/components/HomePageClient";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/scan");
  }

  return <HomePageClient />;
}