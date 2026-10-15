"use client"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LogViewer } from '@patternfly/react-log-viewer'
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import MarkdownPreview from '@uiw/react-markdown-preview';
import { checkJobExists, connectToRunner, createJob, deleteWorkspace, generateAiFiles, getSingleRepo, getUserRequest, mkdirAndCloneRepo, runBuild } from "@/helpers/queries";
import { useSession } from "@/lib/auth-client";

function appendLogLines(prev: string[], raw: unknown): string[] {
    if (typeof raw !== "string" || raw.length === 0) return prev;
    const lines = raw.split("\n").map(l => l.trimEnd()).filter(l => l.length > 0);
    if (lines.length === 0) return prev;
    return [...prev, ...lines].slice(-500);
}

export default function page() {
    const [logData, setLogData] = useState<string[]>([]);
    const [isRebuilding, setIsRebuilding] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const logViewerRef = useRef<HTMLDivElement>(null);

    const [elementLoading, setElementLoading] = useState(true);
    const { workspaceName: name, sandbox } = useParams();
    const workspaceName = name as string;
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
    const liveUrl = `${apiBase}/api/preview/${name}`
    const jobId = workspaceName.split("-").pop();
    const { data: session } = useSession();
    const user = session?.user;
    const { data: jobData, isLoading: jobLoading } = useQuery({ queryKey: ['jobExists', workspaceName], queryFn: () => checkJobExists(workspaceName)})
    const { data: requestData, isLoading: requestLoading } = useQuery({
        queryKey: ['request', workspaceName], queryFn: () => {
            if (!user) return { request: null };
            return getUserRequest(user?.id as string, workspaceName)
        },
        enabled: !!user
    })
    const { data: userRepo } = useQuery({ queryFn: () => getSingleRepo({ username: user?.name as string, repo: requestData?.request?.repository }), enabled: !!requestData?.request?.repository, queryKey: [""] });
    const rawType = requestData?.request?.type ?? "";
    const normalizedType = String(rawType).toLowerCase().replace(/[-_]/g, "");
    const isCiCd = normalizedType === "cicd";
    const { mutate: dirAndClone, isPending: clonePending, data: cloneData } = useMutation({ mutationFn: mkdirAndCloneRepo })
    const { mutate: build, isPending: buildPending } = useMutation({
        mutationFn: ({ workspaceName, force }: { workspaceName: string, force?: boolean }) => runBuild(workspaceName, force),
        onSuccess: (data)=>{
            // Backend may skip when dist already exists.
            if (data?.logsTail?.length) {
                setLogData((prev) => [...prev, ...data.logsTail].slice(-500));
            }
            const request = requestData?.request
            if (request && !jobData?.exists) {
                createJob({cloneUrl: request?.url, previewUrl: liveUrl, repository: request?.repository, requestId: request?.id})
            }
            setElementLoading(false)
            setIsRebuilding(false)
        },
        onError: (error: any) => {
            setLogData((prev) => [...prev, `[error] Build failed: ${error?.response?.data?.message ?? error?.message ?? "unknown error"}`].slice(-500));
            setElementLoading(false)
            setIsRebuilding(false)
        }
    })
    const { mutate: generateAi, isPending: aiPending, data: aiData, error: aiError } = useMutation({ mutationFn: generateAiFiles })

    const alreadyBuilt = !!jobData?.exists && !!jobData?.distExists;
    const building = clonePending || buildPending || isRebuilding;
    const loading = !alreadyBuilt && (elementLoading || clonePending || jobLoading || requestLoading || buildPending);

    async function connectWs() {
        try {
            const ws = await connectToRunner(jobId as string);

            ws.onmessage = (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    if (typeof data?.data === "string") {
                        setLogData((prev) => appendLogLines(prev, data.data));
                    }
                } catch { /* ignore non-JSON frames */ }
            };

            ws.onerror = (error) => {
                console.log(error);
            };

        } catch (error) {
            console.log(error);
        }
    }

    const handlePersistent = useCallback((request: any, force = false) => {
        build({ workspaceName: request?.workspaceName, force })

    }, [build]);

    const handleRebuild = useCallback(() => {
        if (!requestData?.request) return;
        setIsRebuilding(true);
        setLogData([]);
        connectWs();
        build({ workspaceName: requestData.request.workspaceName, force: true });
    }, [requestData?.request]);

    const handleGenerateAi = useCallback(() => {
        generateAi(workspaceName as string);
    }, [generateAi, workspaceName]);

    const handleDelete = useCallback(async () => {
        if (!confirm(`Delete ${workspaceName}? This removes the workspace and its build.`)) return;
        setIsDeleting(true);
        try {
            await deleteWorkspace(workspaceName as string);
            router.push("/dashboard/persistent");
        } catch {
            setLogData((prev) => [...prev, "[error] Delete failed. Try again."].slice(-500));
            setIsDeleting(false);
        }
    }, [workspaceName, router]);

    // Already-built project: show persisted tail, no WS / clone / build.
    useEffect(() => {
        if (alreadyBuilt) {
            const tail: string[] = jobData?.logsTail ?? jobData?.job?.logs?.split("\n").slice(-150) ?? [];
            if (tail.length > 0) setLogData(tail.slice(-150));
            setElementLoading(false);
        }
    }, [alreadyBuilt]);

    useEffect(() => {
        if (alreadyBuilt) return;
        if (jobData?.exists === false) {
            if (!requestData?.request) return;
            connectWs();
            if (requestData?.request) dirAndClone({ cloneUrl: requestData?.request?.url, workspaceName: workspaceName as string });
        } else if (jobData?.exists === true && !jobData?.distExists) {
            // DB says built but files are gone (container recreated) → rebuild once.
            if (!requestData?.request) return;
            connectWs();
            dirAndClone({ cloneUrl: requestData?.request?.url, workspaceName: workspaceName as string });
        }
    }, [jobData?.exists, (jobData as any)?.distExists, requestData?.request, alreadyBuilt]);

    useEffect(() => {
        if (alreadyBuilt) return;
        if (!cloneData?.status) return;

        if (normalizedType === "persistent") {
            handlePersistent(requestData?.request)
        };

        if (isCiCd) {
            handleGenerateAi();
        }

        if (!clonePending && !jobLoading && !requestLoading && !buildPending) {
            setElementLoading(false);
        }

    }, [cloneData?.status]);

    useEffect(() => {
        if (logViewerRef.current) {
            logViewerRef.current.scrollTop = logViewerRef.current.scrollHeight;
        }
    }, [logData]);

    const aiOpinion = (aiData as any)?.aiOpinion;
    const hasAiOutput = aiOpinion && (aiOpinion.dockerfile || aiOpinion["docker-compose"] || aiOpinion["ci-cd"] || aiOpinion.raw);

    return (
        <div className="flex w-full justify-center h-full">
            <div className="md:w-[80%] max-w-[1200px] w-[90%] mt-[32px]" style={{ height: "calc(100vh - 60px)" }}>
                <div className=" border-pink-500 h-[97%] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    <Label className="text-2xl font-semibold">{workspaceName}</Label>
                    {alreadyBuilt && (
                        <p className="text-sm text-green-700 mt-1">Already built — showing cached preview and last build logs. Use Rebuild for a fresh build.</p>
                    )}
                    <div className="md:h-[45%] h-[45%] min-h-[45%]  flex md:flex-row flex-col gap-2">

                        <div className=" border-green-500 h-full md:w-[45%] w-full flex">
                            <div className=" border-red-300 md:w-[98%] w-full md:h-[90%] h-full rounded-md flex flex-col gap-2">
                                <div className=" w-full flex items-center gap-1 h-fit py-2">
                                    <Button disabled={loading} size={"sm"} onClick={() => window.open(liveUrl, "_blank", "noopener,noreferrer")}>Preview</Button>
                                </div>
                                <div className="border rounded-md border-gray-300 w-full h-[89%]">
                                    Thumbnail
                                </div>
                            </div>
                        </div>
                        <div className=" border-green-500 md:w-[55%] flex flex-col gap-3 py-2">
                            <div className=" w-full flex justify-end gap-2 h-fit py-2">
                                <Button onClick={handleRebuild} disabled={loading || building || isDeleting} className="text-blue-700 hover:text-blue-700" variant={"outline"} size={"sm"}>{building ? "Rebuilding..." : "Rebuild"}</Button>
                                <Button onClick={handleDelete} disabled={loading || building || isDeleting} className="text-red-700 hover:text-red-700" variant={"outline"} size={"sm"}>{isDeleting ? "Deleting..." : "Delete"}</Button>
                            </div>
                            <div className="w-full">
                                <Label className="text-gray-500">Live URL</Label>
                                {!loading ? <Link className="text-sm hover:underline break-all" href={liveUrl} target="_blank" rel="noopener noreferrer">
                                    {liveUrl}
                                </Link>
                                    : <Skeleton className="h-4 my-1 bg-gray-200 w-[90%]" />}
                            </div>
                            <div>
                                <Label className="text-gray-500">Repository</Label>
                                {loading ? <Skeleton className="h-4 my-1 bg-gray-200 w-[80%]" /> : <Link className="text-sm hover:underline" href={""}>https://github.com/</Link>}
                            </div>
                            <div>
                                <Label className="text-gray-500">Created</Label>
                                {loading ? <Skeleton className="h-4 my-1 bg-gray-200 w-25" /> : <p className="text-sm">22-11-2025</p>}
                            </div>
                        </div>

                    </div>

                    {/* logs */}
                    <div className="h-[50%] border-green-950">
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full h-fit border-x border-b rounded-b px-2"
                            defaultValue="item-2"
                        >
                            {
                                isCiCd && (
                                    <AccordionItem value="item-1" className="h-fit">
                                        <AccordionTrigger>Dockerfile and CI/CD</AccordionTrigger>
                                        <AccordionContent className="flex flex-col h-fit text-balance ">
                                            {!hasAiOutput ? (
                                                <div className="flex flex-col gap-2">
                                                    <p className="text-sm text-gray-600">{aiPending ? "Generating Dockerfile + CI/CD with AI..." : aiError ? "AI generation failed. Retry below." : "Generate Dockerfile and CI/CD for this workspace with AI."}</p>
                                                    <Button onClick={handleGenerateAi} disabled={aiPending} size="sm" className="w-fit">{aiPending ? "Generating..." : "Generate with AI"}</Button>
                                                </div>
                                            ) : (
                                            <>
                                            <div className="mt-1">
                                                <Label className="text-black my-1">Dockerfile</Label>

                                                <MarkdownPreview
                                                    source={aiOpinion.dockerfile ? "```yaml\n" + aiOpinion.dockerfile + "```" : aiOpinion.raw ? String(aiOpinion.raw).slice(0, 4000) : "No Dockerfile generated."}

                                                    style={{ backgroundColor: "#1f1f1f", color: "white", borderRadius: "5px", padding: "10px" }}
                                            />

                                            </div>

                                            <div className="mt-2">
                                                <Label className="text-black my-1 ">CI/CD</Label>
                                            <MarkdownPreview
                                                source={aiOpinion["ci-cd"] ? "```yaml\n" + aiOpinion["ci-cd"] + "```" : "No CI/CD generated."}

                                                style={{ backgroundColor: "#1f1f1f", color: "white", borderRadius: "5px", padding: "10px" }}
                                            />
                                            </div>
                                            <Button onClick={handleGenerateAi} disabled={aiPending} size="sm" variant="outline" className="w-fit mt-2">{aiPending ? "Regenerating..." : "Regenerate"}</Button>
                                            </>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            }
                            <AccordionItem value="item-2" className="h-fit">
                                <AccordionTrigger>Build Logs {alreadyBuilt ? "(last run)" : ""}</AccordionTrigger>
                                <AccordionContent className="flex flex-col h-fit text-balance ">
                                    {logData.length === 0 ? (
                                        <p className="text-sm text-gray-600 py-2">{building || loading ? "Waiting for build output..." : "No stored logs — Rebuild to stream fresh logs."}</p>
                                    ) : (
                                    <div className="h-fit max-h-[300px] bg-[#1f1f1f] py-2 pl-2 overflow-y-auto rounded-sm text-white text-[15px]" ref={logViewerRef}>
                                        <LogViewer
                                            data={logData}
                                            theme="dark"
                                        />
                                    </div>
                                    )}

                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>Assets</AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 text-balance">
                                    <p></p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                    </div>
                </div>
            </div>
        </div>
    )
}
