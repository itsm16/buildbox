"use client"
import RepoInput from "@/components/repo-input";
import SpinnerText from "@/components/SpinnerText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { generateRandomUsername, generateShortId } from "@/helpers/helpers";
import { connectToRunner, postRepoUrl } from "@/helpers/queries";
import { Label } from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, ArrowRight, Check, ExternalLink } from 'lucide-react'
import { useState } from "react";

export default function page() {

    return (
        <div className="flex w-full justify-center h-full">
            <div className="md:w-[90%] lg:w-[90%] w-[90%] mt-[32px]">
                <div className="">
                    <Label className="font-semibold text-2xl mb-2">Quick Sandbox</Label>
                    <Label className="text-sm">Quickly test a repository in a sandbox environment.</Label>
                    <Label className="text-sm text-red-900">Project will get deleted after leaving the page. Run again to create a new project / preview.</Label>
                    <Separator className="my-4" />
                </div>
                <div className="flex flex-col gap-6">
                    {/* input clone url */}
                    <RepoInput/>

                    {/* Previous */}
                    <div className="lg:w-[50%] md:w-[70%] w-full max-w-[500px] text-sm">
                        <Label>Previous cloned repositories :</Label>
                        <div className="min-h-[350px] flex flex-col gap-2 mt-2">
                            <div className="flex gap-2">
                                <Input readOnly
                                    placeholder="https://previously-cloned-url.com"
                                />
                                <Button variant={"ghost"} size="sm"><Copy /></Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
