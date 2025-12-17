"use client"
import SpinnerText from "@/components/SpinnerText";
import TableComponent from "@/components/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateShortId } from "@/helpers/helpers";
import { connectToRunner, createDir, createRequest, getJobs, getUserById, getUserJobs, getUserRepos, postRepoUrl } from "@/helpers/queries";
import { signInWithGithub, useSession } from "@/lib/auth-client";
import { Label } from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, ArrowRight, Check, ExternalLink, Trash } from 'lucide-react'
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState } from "react";
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
    const [previewUrl, setPreviewUrl] = useState("");
    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const { data } = useSession();
    const session = data?.session;
    const user = data?.user;
    const userId: string = session?.userId!;

    const { data: userJobs, isLoading: userJobsLoading } = useQuery({ queryFn: () => getJobs(user?.id as string), enabled: !!user, queryKey: ["user-jobs"] })
    const { data: userDetail, isPending: getUserPending } = useQuery({ queryFn: () => getUserById(user?.id as string), enabled: !!user, queryKey: ["user-detail"] })
    const { data: userRepoData, isPending: userReposPending } = useQuery({ queryFn: () => getUserRepos(user?.name as string), enabled: !!user, queryKey: ["user-repos"] })
    const { mutate: createReq, isPending: createReqPending } = useMutation({ mutationFn: createRequest })

    function handleCreate() {
        const jobId = generateShortId();
        const name = generateUsername();

        const workspaceName = `${name}-${jobId}`
        const makeReq = createReq({ workspaceName, url: repoUrl, repo, type: "PERSISTENT", userId })

        redirect(`/dashboard/preview/${workspaceName}`)
    }

    function handleSelect() {
        const jobId = generateShortId();
        const name = generateUsername();

        const workspaceName = `${name}-${jobId}`
        const makeReq = createRequest({ workspaceName, url: repoUrl, repo, type: "PERSISTENT", userId})

        redirect(`/dashboard/preview/${workspaceName}`)
    }

    function handleGithubLogin() {
        const res = signInWithGithub()
    }

    return (
        <div className="flex w-full justify-center h-full">
            <div className="md:w-[90%] lg:w-[90%] w-[90%] mt-[32px]" style={{ height: "calc(100vh - 60px)" }}>
                <div className="">
                    <Label className="font-semibold text-2xl mb-2">Persistent Sandbox</Label>
                    <Label className="text-sm">Create a persistent sandbox environment for your project.</Label>
                    <Separator className="my-4" />
                </div>
                <div className="flex flex-col gap-6 h-[90%]">
                    <div className="flex md:w-[80%] w-full h-[30%] gap-2">
                        <div className="flex flex-col gap-2 w-[50%]">
                            <Label className="font-normal text-md">Repository URL :</Label>
                            <Input
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                placeholder="https://github.com/username/repository" />
                            <div className="flex gap-7 items-center">
                                <Button
                                    onClick={handleCreate}
                                    className="flex items-center gap-2 w-[100px] text-sm"><ArrowRight />Create</Button>

                                {createReqPending && <SpinnerText text="Creating directory..." />}
                            </div>
                        </div>

                        <Separator orientation="vertical" className="mr-1"/>
                        {/* Repo select */}
                        <div className="flex flex-col gap-2 h-full w-[50%]">
                            <div className="h-[90%]">
                                <Label className="font-normal text-md w-full flex justify-between">
                                    {userDetail?.userDetail?.loginType === "github" ? <p>Select repository - </p>: ""}
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
                                {
                                userDetail?.userDetail?.loginType === "github" 
                                ?
                                <div className="h-full mt-1 overflow-y-auto border rounded-sm flex flex-col items-center gap-1">
                                        
                                    {
                                        !(userReposPending) ?
                                        userRepoData?.repos.map((repo: any) => (
                                            <div id={repo.id} key={repo.id} className="border-b py-1 h-12 w-[97%] flex px-2 items-center justify-between"
                                                onMouseOver={(e) => {
                                                    const { id } = repo;
                                                    setHoveredRepo(id)
                                                    setRepoUrl(repo?.clone_url)
                                                    setRepo(repo?.name)
                                                }}
                                                onMouseLeave={() => setHoveredRepo(null)}>
                                                <Label className="text-sm">{repo.name}</Label>
                                                {hoveredRepo == repo.id && <Button
                                                    onClick={handleSelect}
                                                    size="sm" variant="outline">Select</Button>}
                                            </div>
                                        ))
                                        :
                                        <SpinnerText text="Loading repositories..." />
                                    }

                                </div> : ""
                                }
                            </div>
                            {/* Job Status */}

                            {/* {jobStatus && (
                                <div className="flex flex-col md:w-[60%] w-full text-sm py-1">
                                    <Label className="font-normal text-md">Status:</Label>
                                    <div className="text-sm text-gray-600 flex">{jobStatus} {jobStatus && jobStatus === "Build completed" && <Check size={17} className="text-green-700 mx-2 font-semibold" />}</div>
                                </div>
                            )} */}
                        </div>
                    </div>

                    {/* Previous */}
                    <div className=" w-full h-[70%] text-sm">
                        <TableComponent data={userJobs?.jobs} />
                    </div>
                </div>
            </div>
        </div>
    )
}
