"use client"
import SpinnerText from "@/components/SpinnerText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateShortId } from "@/helpers/helpers";
import { connectToRunner, postRepoUrl } from "@/helpers/queries";
import { Label } from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, ArrowRight, Check, ExternalLink, Trash } from 'lucide-react'
import Link from "next/link";
import { useState } from "react";

const invoices = [
    {
        workspaceName: "green-lime-a23ef"
    },
]


export default function page() {
    const [previewUrl, setPreviewUrl] = useState("");

    return (
        <div className="flex w-full justify-center h-full">
            <div className="md:w-[90%] lg:w-[90%] w-[90%] mt-[32px]" style={{ height: "calc(100vh - 60px)" }}>
                <div className="">
                    <Label className="font-semibold text-2xl mb-2">Dashboard</Label>
                    <Label className="text-sm">Create a persistent sandbox environment for your project.</Label>
                    <Separator className="my-4" />
                </div>
                <div className="flex flex-col gap-6 h-[90%]">
                    <div className="flex flex-col md:w-[60%] w-full h-[20%] gap-2">
                      <div className="flex gap-2">
                        <Button variant={"outline"}>
                        Quick Sandbox
                        </Button>
                        <Button variant={"outline"}>
                          Persistent Sandbox
                        </Button>
                        <Button variant={"outline"}>
                            Generate - get dockerfile, ci/cd
                        </Button>
                      </div>
                    </div>

                    {/* Previous */}
                    <div className=" w-full h-[80%] text-sm">
                        <Table className="border">
                            <TableCaption>Existing projects</TableCaption>
                            <TableHeader>
                                <TableRow className="bg-gray-100">
                                    <TableHead className="w-[100px]">Name</TableHead>
                                    <TableHead className="text-right">Open preview</TableHead>
                                    <TableHead className="text-right">Delete</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((invoice) => (
                                    <TableRow key={invoice.workspaceName}>
                                        <TableCell className="font-medium"><Link className="underline" href={`/dashboard/preview/${invoice.workspaceName}`}>{invoice.workspaceName}</Link></TableCell>
                                        <TableCell className="text-right">
                                            <Button size={"sm"} onClick={() => window.open(previewUrl, "_blank")}>
                                                <ExternalLink />
                                            </Button></TableCell>
                                        <TableCell className="text-right"><Button size={"sm"}><Trash /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    )
}
