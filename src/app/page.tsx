import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";

/** Route the root to the console or the login screen. */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
