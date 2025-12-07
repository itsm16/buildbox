import SignIn from "@/components/SignIn";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export  default async function page() {

  const data = await auth.api.getSession({
    headers: await headers()
  })

  if (data?.session) {
    redirect("/dashboard");
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-gray-600">Sign in to your account</p>
        <SignIn/>
      </div>
    </div>
  )
}
