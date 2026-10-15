"use client"
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

const DEFAULT_TEST_REPO = "https://github.com/itsm16/postApp-ui.git";

export default function RepoInput({ initialUrl = DEFAULT_TEST_REPO }: { initialUrl?: string }) {
    const [repoUrl, setRepoUrl] = useState(initialUrl);
    const [previewUrl, setPreviewUrl] = useState("");
    const [jobStatus, setJobStatus] = useState<string | null>(null);

    const connectWs = useMutation({
        mutationFn: connectToRunner,
    })

    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

    const postUrl = useMutation({
        mutationFn: postRepoUrl,
        onSuccess: (data) => {
            if (data?.skipped) {
                setJobStatus("Build already exists, showing cached preview");
            }
            // Server returns absolute ngrok URL when configured, else a relative
            // path — resolve the latter against the API base (persistent behavior).
            const raw: string = data?.previewUrl ?? "";
            setPreviewUrl(raw.startsWith("http") ? raw : `${apiBase}${raw.startsWith("/") ? "" : "/"}${raw}`);
        },
        onError: (error: any) => {
            setJobStatus(`Failed: ${error?.response?.data?.message ?? error?.message ?? "unknown error"}`);
        }
    })

    const handleRun = async () => {
        if (!repoUrl.trim()) {
            alert('Please enter a repository URL');
            return;
        }

        const jobId = generateShortId()
        const name = generateRandomUsername();
        const dirName = `${name}-${jobId}`

        try {
            const ws = await connectToRunner(jobId);

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'info') {
                    setJobStatus(data.data);
                } else if (data.type === 'done') {
                    setJobStatus('Build completed');
                }
                // console.log(JSON.parse(event.data))
            };

            ws.onerror = (error) => {
                setJobStatus('Connection error');
            };

        } catch (error) {
            setJobStatus('Failed to connect');
        }

        postUrl.mutate({ url: repoUrl, dirName })
    }

    return (
        <div className="flex flex-col md:w-[60%] w-full gap-2">
            <Label className="font-normal text-md">Repository URL :</Label>
            <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository" />
            <div className="flex gap-7 items-center">
                <Button
                    disabled={postUrl.isPending}
                    onClick={handleRun}
                    className="flex items-center gap-2 w-[100px] text-sm"><ArrowRight />Run</Button>

                {/* Job Status */}
                {jobStatus && (
                    <div className="flex flex-col md:w-[60%] w-full text-sm py-1">
                        <Label className="font-normal text-md">Status:</Label>
                        <div className="text-sm text-gray-600 flex">{jobStatus} {jobStatus && jobStatus === "Build completed" && <Check size={17} className="text-green-700 mx-2 font-semibold" />}</div>
                    </div>
                )}
            </div>
            {/* Preview */}
            {
                postUrl.isPending ? <SpinnerText text="Setting up project..." />
                    :
                    postUrl.data && <div className="flex flex-col md:w-[60%] w-full gap-2 transition duration-300 ease-in-out">
                        <Label>Preview URL :</Label>
                        <Input readOnly value={previewUrl} />
                        <div className="flex gap-2">
                            <Button className="flex items-center text-sm"
                                size={"sm"}
                                onClick={() => navigator.clipboard.writeText(previewUrl)}
                            >
                                <Copy />
                            </Button>
                            <Button size={"sm"} onClick={() => window.open(previewUrl, "_blank")}>
                                <ExternalLink />
                            </Button>
                        </div>

                    </div>
            }
        </div>
    )
}
