import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
    const data = await auth.api.getSession({
    headers: await headers()
  })

  if (data?.session) {
    redirect("/dashboard");
  }else{
    redirect("/signin");
  }

  return (
    <div></div>
  );
}
