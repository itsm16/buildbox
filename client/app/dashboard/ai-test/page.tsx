"use client"
import SpinnerText from "@/components/SpinnerText";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { generateAiFiles, getWorkspaces } from "@/helpers/queries";
import { Label as RadixLabel } from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery } from "@tanstack/react-query";
import MarkdownPreview from '@uiw/react-markdown-preview';
import { Check, Copy, Download } from 'lucide-react'
import { useState } from "react";

function downloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function FileCard({ title, filename, content }: { title: string, filename: string, content: string }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div className="mt-3">
            <div className="flex items-center justify-between my-1">
                <Label className="text-black">{title}</Label>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopy}>
                        {copied ? <Check size={15} className="text-green-700" /> : <Copy size={15} />} Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadFile(filename, content)}>
                        <Download size={15} /> {filename}
                    </Button>
                </div>
            </div>
            <MarkdownPreview
                source={"```yaml\n" + content + "```"}
                style={{ backgroundColor: "#1f1f1f", color: "white", borderRadius: "5px", padding: "10px" }}
            />
        </div>
    );
}

export default function page() {
    const [workspaceName, setWorkspaceName] = useState("");

    const { data: wsData, isPending: wsPending, isError: wsError, refetch: refetchWorkspaces } = useQuery({
        queryFn: getWorkspaces,
        queryKey: ["workspaces"],
    });
    const { mutate: generate, isPending: aiPending, data: aiData, error: aiError, reset: resetAi } = useMutation({
        mutationFn: generateAiFiles,
    });

    const workspaces: { workspaceName: string, hasPackageJson: boolean }[] = wsData?.workspaces ?? [];
    const selectable = workspaces.filter(w => w.hasPackageJson);

    function handleGenerate() {
        if (!workspaceName) return;
        resetAi();
        generate(workspaceName);
    }

    const aiOpinion = (aiData as any)?.aiOpinion;
    const files = aiOpinion && !aiOpinion.raw ? [
        aiOpinion.dockerfile && { title: "Dockerfile", filename: "Dockerfile", content: aiOpinion.dockerfile },
        aiOpinion["docker-compose"] && { title: "Docker Compose", filename: "docker-compose.yml", content: aiOpinion["docker-compose"] },
        aiOpinion["ci-cd"] && { title: "CI/CD", filename: "ci.yml", content: aiOpinion["ci-cd"] },
        aiOpinion["nginx-conf"] && { title: "Nginx conf", filename: "nginx.conf", content: aiOpinion["nginx-conf"] },
        aiOpinion["caddyfile"] && { title: "Caddyfile", filename: "Caddyfile", content: aiOpinion["caddyfile"] },
    ].filter(Boolean) as { title: string, filename: string, content: string }[] : [];

    return (
        <div className="flex w-full justify-center h-full">
            <div className="md:w-[90%] lg:w-[90%] w-[90%] mt-[32px]" style={{ height: "calc(100vh - 60px)" }}>
                <div className="">
                    <RadixLabel className="font-semibold text-2xl mb-2">Generate</RadixLabel>
                    <RadixLabel className="text-sm">Pick a cloned project from the sandbox runner, get dockerfile + ci/cd for it using AI</RadixLabel>
                    <Separator className="my-4" />
                </div>
                <div className="flex flex-col gap-4 h-[90%] overflow-y-auto pb-8" style={{ scrollbarWidth: "none" }}>
                    <div className="flex flex-col md:w-[80%] lg:w-[50%] w-full gap-2">
                        <Label className="font-normal text-md">Sandbox workspace :</Label>
                        {wsPending ? <SpinnerText text="Loading workspaces..." /> :
                            wsError ? (
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm text-red-600">Could not load workspaces from the runner.</p>
                                    <Button size="sm" variant="outline" className="w-fit" onClick={() => refetchWorkspaces()}>Retry</Button>
                                </div>
                            ) : selectable.length === 0 ? (
                                <p className="text-sm text-gray-600">No cloned projects in the runner yet. Build one from Quick or Persistent sandbox first.</p>
                            ) : (
                                <select
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    className="border rounded-md px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">Select a workspace…</option>
                                    {selectable.map((w) => (
                                        <option key={w.workspaceName} value={w.workspaceName}>{w.workspaceName}</option>
                                    ))}
                                </select>
                            )}
                        <div className="flex gap-3 items-center">
                            <Button
                                onClick={handleGenerate}
                                disabled={!workspaceName || aiPending}
                                className="w-fit text-sm"
                            >
                                {aiPending ? "Generating..." : "Generate with AI"}
                            </Button>
                            {aiPending && <SpinnerText text="Asking Gemini..." />}
                        </div>
                        {aiError && (
                            <p className="text-sm text-red-600">
                                Generation failed: {(aiError as any)?.response?.data?.message ?? (aiError as Error)?.message ?? "unknown error"}
                            </p>
                        )}
                    </div>

                    {aiOpinion?.raw ? (
                        <div className="w-full">
                            <Label>Output</Label>
                            <MarkdownPreview
                                source={String(aiOpinion.raw).slice(0, 8000)}
                                style={{ backgroundColor: "#1f1f1f", color: "white", borderRadius: "5px", padding: "10px" }}
                            />
                        </div>
                    ) : files.length > 0 ? (
                        <div className="w-full">
                            <Label className="text-gray-500">Generated for {workspaceName}</Label>
                            {files.map((f) => (
                                <FileCard key={f.filename} title={f.title} filename={f.filename} content={f.content} />
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
