"use client"
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { signIn, signInWithGithub } from "@/lib/auth-client";
import SpinnerText from "./SpinnerText";
import { Label } from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { IoLogoGithub } from "react-icons/io";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [githubLoading, setGithubLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data } = await signIn.email({
            email,
            password,
            callbackURL: "/dashboard"
        });

        setLoading(false);
    };

    async function handleGithubLogin() {
        setGithubLoading(true);
        const res = await signInWithGithub();
        setGithubLoading(false);
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    placeholder="Email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                    placeholder="Password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {loading ? <SpinnerText text="Redirecting..." /> : <Button disabled={loading || githubLoading} type="submit" className="w-full">Sign In</Button>}
            </form>
                {githubLoading ? <SpinnerText text="Trying..." /> : <Button disabled={githubLoading || loading} onClick={handleGithubLogin} className="w-full"><IoLogoGithub/> Sign In with Github</Button>}
            <hr className="mt-5" />
            <Label>Not a user? <Link href="/signup" className="text-blue-500">Sign Up</Link></Label>
        </>
    )
}
