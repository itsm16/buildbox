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

export default function page() {
    const [repoUrl, setRepoUrl] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [jobStatus, setJobStatus] = useState<string | null>(null);

    const connectWs = useMutation({
        mutationFn: connectToRunner,
    })

    const postUrl = useMutation({
        mutationFn: postRepoUrl,
        onSuccess: (data) => {
            setPreviewUrl(data.previewUrl);
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
        <div className="flex w-full justify-center h-full">
            <div className="md:w-[90%] lg:w-[90%] w-[90%] mt-[32px]">
                <div className="">
                    <Label className="font-semibold text-2xl mb-2">Quick Sandbox</Label>
                    <Label className="text-sm">Quickly test a repository in a sandbox environment.</Label>
                    <Label className="text-sm text-red-900">Project will get deleted after leaving the page. Run again to create a new project / preview.</Label>
                    <Separator className="my-4" />
                </div>
                <div className="flex flex-col gap-6">
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
