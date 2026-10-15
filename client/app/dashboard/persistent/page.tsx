"use client"
import SpinnerText from "@/components/SpinnerText";
import TableComponent from "@/components/Table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateShortId } from "@/helpers/helpers";
import { connectToRunner, createDir, createRequest, deleteWorkspace, getJobs, getUserById, getUserJobs, getUserRepos, postRepoUrl } from "@/helpers/queries";
import { signInWithGithub, useSession } from "@/lib/auth-client";
import { Label } from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ArrowRight, Check, ExternalLink, Trash } from 'lucide-react'
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IoLogoGithub } from "react-icons/io";
import { generateUsername } from "unique-username-generator";

const invoices = [
    {
        workspaceName: "green-lime-a23ef"
    },
]


const DEFAULT_TEST_REPO = "https://github.com/itsm16/postApp-ui.git";

export default function page() {
    const [repoUrl, setRepoUrl] = useState(DEFAULT_TEST_REPO);
    const [repo, setRepo] = useState("");
    const [hoveredRepo, setHoveredRepo] = useState<string | null>("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const { data } = useSession();
    const session = data?.session;
    const user = data?.user;
    const userId: string = session?.userId!;

    const router = useRouter();
    const queryClient = useQueryClient();
    const [deletingName, setDeletingName] = useState<string | null>(null);

    const { data: userJobs, isLoading: userJobsLoading } = useQuery({ queryFn: () => getJobs(user?.id as string), enabled: !!user, queryKey: ["user-jobs"] })
    const { data: userDetail, isPending: getUserPending } = useQuery({ queryFn: () => getUserById(user?.id as string), enabled: !!user, queryKey: ["user-detail"] })
    const isGithubConnected = userDetail?.userDetail?.loginType === "github" && !!user?.name;
    const { data: userRepoData, isPending: userReposPending, isError: userReposError } = useQuery({ queryFn: () => getUserRepos(user?.name as string), enabled: isGithubConnected, queryKey: ["user-repos"] })
    const { mutateAsync: createReqAsync, isPending: createReqPending } = useMutation({
        mutationFn: createRequest,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-jobs"] }),
    })
    const { mutateAsync: deleteWsAsync } = useMutation({
        mutationFn: deleteWorkspace,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-jobs"] }),
    })

    function repoNameFromUrl(url: string) {
        return url.split("/").pop()?.replace(/\.git$/, "") ?? "";
    }

    async function saveAndOpen(url: string, repoName: string) {
        if (!url.trim()) {
            setJobStatus("Enter a repository URL or pick one from GitHub first.");
            return;
        }
        const jobId = generateShortId();
        const name = generateUsername();

        const workspaceName = `${name}-${jobId}`
        try {
            // Persist first so the preview page + table always find the request row.
            await createReqAsync({ workspaceName, url, repo: repoName || repoNameFromUrl(url), type: "PERSISTENT", userId })
            router.push(`/dashboard/preview/${workspaceName}`)
        } catch {
            setJobStatus("Failed to save. Check the server connection and try again.");
        }
    }

    function handleCreate() {
        saveAndOpen(repoUrl, repo);
    }

    function handleSelect() {
        saveAndOpen(repoUrl, repo);
    }

    async function handleDelete(workspaceName: string) {
        if (!workspaceName || !confirm(`Delete ${workspaceName}? This removes the workspace and its build.`)) return;
        setDeletingName(workspaceName);
        try {
            await deleteWsAsync(workspaceName);
        } catch {
            setJobStatus(`Failed to delete ${workspaceName}. Try again.`);
        } finally {
            setDeletingName(null);
        }
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
                                    disabled={createReqPending}
                                    className="flex items-center gap-2 w-[100px] text-sm"><ArrowRight />Create</Button>

                                {createReqPending && <SpinnerText text="Saving..." />}
                            </div>
                            {jobStatus && <p className="text-sm text-red-600">{jobStatus}</p>}
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
                                        userReposError ?
                                        <p className="text-sm text-red-600 py-2">Could not load repositories. Check the GitHub connection and try again.</p> :
                                        !(userReposPending) ?
                                        (userRepoData?.repos ?? []).map((repo: any) => (
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
                        <TableComponent data={userJobs?.jobs} onDelete={handleDelete} deletingName={deletingName} />
                    </div>
                </div>
            </div>
        </div>
    )
}
