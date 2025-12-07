"use client"
import SpinnerText from "@/components/SpinnerText";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateShortId } from "@/helpers/helpers";
import { connectToRunner, createRequest, getUserById, getUserRepos } from "@/helpers/queries";
import { signInWithGithub, useSession } from "@/lib/auth-client";
import { Label } from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, Trash } from 'lucide-react'
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { IoLogoGithub } from "react-icons/io";
import { generateUsername } from "unique-username-generator";

const invoices = [
    {
        workspaceName: "green-lime-a23ef"
    },
]


export default function page() {
    const [repoUrl, setRepoUrl] = useState("");
    const [repo, setRepo] = useState("");
    const [hoveredRepo, setHoveredRepo] = useState<string | null>("");

    const { data: session } = useSession();
    const user = session?.user;
    const userId = session?.session?.userId;
    const { data: userDetail, isPending: getUserPending } = useQuery({queryFn: ()=> getUserById(user?.id as string),enabled: !!user, queryKey: ["user-detail"]})
    const {data: userRepoData, isPending: userReposPending} = useQuery({queryFn: ()=> getUserRepos(user?.name as string), enabled: !!user, queryKey: ["user-repos"]})
    const {mutate: createReq, isPending: createReqPending} = useMutation({mutationFn: createRequest})

    function handleGithubLogin() {
        const res = signInWithGithub()
    }

    function handleSelect() {
        const jobId = generateShortId();
        const name = generateUsername();

        const workspaceName = `${name}-${jobId}`
        const makeReq = createRequest({workspaceName, url: repoUrl, repo, type: "CI_CD", userId: userId as string})

        redirect(`/dashboard/preview/${workspaceName}`)
    }

    return (
        <div className="flex w-full justify-center h-full">
            <div className="md:w-[90%] lg:w-[90%] w-[90%] mt-[32px]" style={{ height: "calc(100vh - 60px)" }}>
                <div className="">
                    <Label className="font-semibold text-2xl mb-2">Generate</Label>
                    <Label className="text-sm">get dockerfile, ci/cd for your project using AI</Label>
                    <Separator className="my-4" />
                </div>
                <div className="flex flex-col gap-6 h-[90%]">
                    <div className="flex flex-col md:w-[80%] lg:w-[50%] w-full h-[35%] gap-2">
                        <div className="flex flex-col gap-2 h-full">
                            <div className="h-[90%]">
                                <Label className="font-normal text-md w-full flex justify-between">
                                    <p>Select repository - </p>
                                    <Button
                                        onClick={handleGithubLogin}
                                        variant={"outline"}
                                        size={"sm"}
                                    >
                                        {
                                            getUserPending ? <SpinnerText text="" /> 
                                            :
                                            userDetail?.userDetail && userDetail?.userDetail?.loginType === "github" ? <><IoLogoGithub />Github{getUserPending ? <SpinnerText text="" /> : <Check size={17} className="text-green-700 mx-2 font-semibold" />}</> : <><IoLogoGithub /> Connect Github</>
                                        }
                                    </Button></Label>
                                <div className="h-full mt-1 overflow-y-auto border rounded-sm flex flex-col items-center gap-1">
                                    {!(userReposPending)? 
                                        userRepoData?.repos.map((repo : any)=>(
                                            <div id={repo.id} key={repo.id} className="border-b py-1 h-12 w-[97%] flex px-2 items-center justify-between" 
                                            onMouseOver={(e)=>{
                                                const {id} = repo;
                                                setHoveredRepo(id)
                                                setRepoUrl(repo?.clone_url)
                                                setRepo(repo?.name)
                                            }} 
                                            onMouseLeave={()=>setHoveredRepo(null)}>
                                                <Label className="text-sm">{repo.name}</Label>
                                                {hoveredRepo == repo.id && <Button
                                                onClick={handleSelect} 
                                                size="sm" variant="outline">Select</Button>}
                                            </div>
                                        ))
                                     : 
                                     <SpinnerText text="Loading repositories..."/>}
                                    
                                </div>
                            </div>
                            {/* Job Status */}
                            {/*
                                {jobStatus && (
                                    <div className="flex flex-col md:w-[60%] w-full text-sm py-1">
                                        <Label className="font-normal text-md">Status:</Label>
                                        <div className="text-sm text-gray-600 flex">{jobStatus} {jobStatus && jobStatus === "Build completed" && <Check size={17} className="text-green-700 mx-2 font-semibold" />}</div>
                                    </div>
                                )} */}
                        </div>
                    </div>

                    {/* Previous */}
                    <div className=" w-full h-[65%] text-sm">
                        <Table className="border">
                            <TableCaption>Existing projects</TableCaption>
                            <TableHeader>
                                <TableRow className="bg-gray-100">
                                    <TableHead className="w-[100px]">Name</TableHead>
                                    <TableHead className="text-right">Preview</TableHead>
                                    <TableHead className="text-right">Delete</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((invoice) => (
                                    <TableRow key={invoice.workspaceName}>
                                        <TableCell className="font-medium"><Link className="underline" href={`/dashboard/preview/${invoice.workspaceName}`}>{invoice.workspaceName}</Link></TableCell>
                                        <TableCell className="text-right">
                                            <Button size={"sm"}>
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
