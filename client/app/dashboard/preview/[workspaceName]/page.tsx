"use client"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LogViewer } from '@patternfly/react-log-viewer'
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import MarkdownPreview from '@uiw/react-markdown-preview';
import { checkJobExists, connectToRunner, getSingleRepo, getUserRequest, mkdirAndCloneRepo, runBuild } from "@/helpers/queries";
import { useSession } from "@/lib/auth-client";

export default function page() {
    const [logData, setLogData] = useState<string[]>([]);
    const logViewerRef = useRef<HTMLDivElement>(null);

    const [elementLoading, setElementLoading] = useState(true);
    const { workspaceName: name, sandbox } = useParams();
    const workspaceName = name as string;
    const liveUrl = `https://donya-subacute-nonfortuitously.ngrok-free.dev/api/preview/${name}`
    const jobId = workspaceName.split("-").pop();
    const { data: session } = useSession();
    const user = session?.user;
    const { data: jobData, isLoading: jobLoading } = useQuery({ queryKey: ['jobExists'], queryFn: () => checkJobExists(workspaceName) })
    const { data: requestData, isLoading: requestLoading } = useQuery({
        queryKey: ['request'], queryFn: () => {
            if (!user) return { request: null };
            return getUserRequest(user?.id as string, workspaceName)
        },
        enabled: !!user
    })
    const { data: userRepo } = useQuery({ queryFn: () => getSingleRepo({ username: user?.name as string, repo: requestData?.request?.repository }), enabled: !!requestData?.request?.repository, queryKey: [""] });
    const type = requestData?.request?.type?.toLowerCase()
    const { mutate: dirAndClone, isPending: clonePending, data: cloneData } = useMutation({ mutationFn: mkdirAndCloneRepo })
    const { mutate: build, isPending: buildPending } = useMutation({ mutationFn: runBuild })

    const loading = elementLoading || clonePending || jobLoading || requestLoading || buildPending;

    async function connectWs() {
        try {
            const ws = await connectToRunner(jobId as string);

            ws.onmessage = (event: any) => {
                const data = JSON.parse(event.data);
                setLogData((prev) => [...prev, data.data]);
            };

            ws.onerror = (error) => {
                console.log(error);
            };

        } catch (error) {
            console.log(error);
        }
    }

    const handlePersistent = useCallback((request: any) => {
        build(request?.workspaceName)

    }, []);

    const handleCiCd = useCallback((data: any) => {

        console.log("ci-cd");
        console.log(workspaceName);

    }, []);

    useEffect(() => {
        if (jobData?.exists === false) {
            if (!requestData?.request) return;
            connectWs();
            if (requestData?.request) dirAndClone({ cloneUrl: requestData?.request?.url, workspaceName: workspaceName as string });
        }
    }, [jobData?.exists, requestData?.request]);

    useEffect(() => {
        if (!cloneData?.status) return;

        if (type === "persistent") {
            handlePersistent(requestData?.request)
        };

        // if (sandbox === "ci-cd-test") handleCiCd(data);

        if (!clonePending && !jobLoading && !requestLoading && !buildPending) {
            setElementLoading(false);
        }
    }, [cloneData?.status]);

    useEffect(() => {
        if (logViewerRef.current) {
            logViewerRef.current.scrollTop = logViewerRef.current.scrollHeight;
        }
    }, [logData]);

    return (
        <div className="flex w-full justify-center h-full">
            <div className="md:w-[80%] max-w-[1200px] w-[90%] mt-[32px]" style={{ height: "calc(100vh - 60px)" }}>
                <div className=" border-pink-500 h-[97%] overflow-y-auto">
                    <Label className="text-2xl font-semibold">{workspaceName}</Label>
                    <div className="md:h-[45%] h-[45%] min-h-[45%]  flex md:flex-row flex-col gap-2">

                        <div className=" border-green-500 h-full md:w-[45%] w-full flex">
                            <div className=" border-red-300 md:w-[98%] w-full md:h-[90%] h-full rounded-md flex flex-col gap-2">
                                <div className=" w-full flex items-center gap-1 h-fit py-2">
                                    <Button disabled={loading} size={"sm"}>Preview</Button>
                                </div>
                                <div className="border rounded-md border-gray-300 w-full h-[89%]">
                                    Thumbnail
                                </div>
                            </div>
                        </div>
                        <div className=" border-green-500 md:w-[55%] flex flex-col gap-3 py-2">
                            <div className=" w-full flex justify-end gap-2 h-fit py-2">
                                <Button disabled={loading} className="text-blue-700 hover:text-blue-700" variant={"outline"} size={"sm"}>Rebuild</Button>
                                <Button disabled={loading} className="text-red-700 hover:text-red-700" variant={"outline"} size={"sm"}>Delete</Button>
                            </div>
                            <div className="w-full">
                                <Label className="text-gray-500">Live URL</Label>
                                {!loading ? <Link className="text-sm hover:underline" href={liveUrl}>
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
                                type === "ci_cd" && (
                                    <AccordionItem value="item-1" className="h-fit">
                                        <AccordionTrigger>Dockerfile and CI/CD</AccordionTrigger>
                                        <AccordionContent className="flex flex-col h-fit text-balance ">
                                            <div className="mt-1">
                                                <Label className="text-black my-1">Dockerfile</Label>
                                                
                                                <MarkdownPreview
                                                // added ```yaml\n at start and ``` at end
                                                    source={"```yaml\nFROM node:lts-alpine as builder\n\nWORKDIR /app\n\n# Copy package.json and any lock files to leverage Docker cache\nCOPY package.json ./package.json\nCOPY package-lock.json ./package-lock.json\n\n# Install dependencies\nRUN npm install\n\n# Copy the rest of the application files\nCOPY . .\n\n# Build the application for production\nRUN npm run build\n\n# Stage 2: Serve the built application with a lightweight static server\nFROM node:lts-alpine\n\nWORKDIR /app\n\n# Copy the build output from the builder stage\nCOPY --from=builder /app/dist ./dist\n\n# Install 'serve' globally to serve static files\nRUN npm install -g serve\n\n# Expose the port where the application will be served\nEXPOSE 3000\n\n# Command to run the static server\nCMD [\"serve\", \"-s\", \"dist\", \"-l\", \"3000\"]```"}

                                                    style={{ backgroundColor: "#1f1f1f", color: "white", borderRadius: "5px", padding: "10px" }}
                                            />
                                            
                                            </div>

                                            <div className="mt-2">
                                                <Label className="text-black my-1 ">CI/CD</Label>
                                            <MarkdownPreview
                                                source={"```yaml\nname: Project Update Trigger\n\non:\n  push:\n    branches:\n      - main # Adjust to your main branch name (e.g., master, develop)\n\njobs:\n  trigger-update:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Trigger external update API\n        env:\n          # Define your API URL as a GitHub secret for security\n          CI_UPDATE_API_URL: ${{ secrets.UPDATE_API_URL }}\n        run: |\n          if [ -z \"$CI_UPDATE_API_URL\" ]; then\n            echo \"Error: CI_UPDATE_API_URL environment variable is not set. Please add it as a GitHub secret.\"\n            exit 1\n          fi\n          echo \"Sending update trigger to $CI_UPDATE_API_URL...\"\n          curl -X POST \\\n               -H \"Content-Type: application/json\" \\\n               -d '{\"event\": \"push\", \"repository\": \"${{ github.repository }}\", \"ref\": \"${{ github.ref }}\", \"commit\": \"${{ github.sha }}\"}' \\\n               \"$CI_UPDATE_API_URL\"\n          echo \"Trigger sent successfully.\"\n```"}

                                                style={{ backgroundColor: "#1f1f1f", color: "white", borderRadius: "5px", padding: "10px" }}
                                            />
                                            </div>
                                            
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            }
                            <AccordionItem value="item-2" className="h-fit">
                                <AccordionTrigger>Build Logs</AccordionTrigger>
                                <AccordionContent className="flex flex-col h-fit text-balance ">
                                    {/* one log item */}
                                    {/* <div className="overflow-y-scroll border-x px-2 h-[200px]">
                                        <div className="flex gap-3 hover:bg-gray-100 hover:border-l-2 hover:border-black text-[15px] px-2">
                                            <p className="">3:08:22</p>
                                            <p>Build started</p>
                                        </div>
                                    </div> */}

                                    <div className="h-fit max-h-[310px] bg-[#1f1f1f] py-2 pl-2 overflow-y-auto rounded-sm text-white text-[15px]" ref={logViewerRef}>
                                        <LogViewer
                                            data={logData}
                                            theme="dark"
                                        />
                                    </div>

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
