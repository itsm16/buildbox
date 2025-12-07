"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";
import { Label } from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useState } from "react";

export default function page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function handleSubmit(params: React.FormEvent) {
    params.preventDefault();

    const { data, error } = await signUp.email({
      email,
      password,
      name,
      callbackURL: "/dashboard"
    });

  }

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-2xl font-bold">Sign Up</h1>
        <p className="text-sm text-gray-600">Create your account to get started</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full">Sign Up</Button>
        </form>
        <hr className="mt-5" />
        <Label>Already a user? <Link href="/signin" className="text-blue-500">Sign In</Link></Label>
      </div>
    </div>
  )
}
