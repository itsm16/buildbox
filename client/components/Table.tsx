import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "./ui/button";
import { ExternalLink, Trash } from "lucide-react";
import Link from "next/link";

function workspaceOf(job: any): string {
    return job?.request?.workspaceName ?? job?.previewUrl?.split("/").pop() ?? "";
}

export default function TableComponent({data, onDelete, deletingName}: {
    data: any,
    onDelete?: (workspaceName: string) => void,
    deletingName?: string | null,
}) {
    return (
        <Table className="border">
            <TableCaption>Existing projects</TableCaption>
            <TableHeader>
                <TableRow className="bg-gray-100">
                    <TableHead className="w-[100px]">Name</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead className="text-right">Open preview</TableHead>
                    <TableHead className="text-right">Delete</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {(!data || data.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500">No projects yet — create one above.</TableCell>
                    </TableRow>
                )}
                {data?.map((job: any) => {
                    const workspaceName = workspaceOf(job);
                    const repo = job?.request?.repository || job?.repository || "";
                    const url = job?.request?.url || job?.cloneUrl || "";
                    const isDeleting = deletingName === workspaceName;

                    return (
                        <TableRow key={job?.id ?? workspaceName}>
                            <TableCell className="font-medium"><Link className="underline" href={`/dashboard/preview/${workspaceName}`}>{workspaceName}</Link></TableCell>
                            <TableCell className="max-w-[280px] truncate" title={url || repo}>{repo || url || "-"}</TableCell>
                            <TableCell className="text-right">
                                <Button size={"sm"} onClick={() => window.open(job?.previewUrl, "_blank")}>
                                    <ExternalLink />
                                </Button></TableCell>
                            <TableCell className="text-right">
                                <Button size={"sm"} variant="outline" disabled={isDeleting || !onDelete} onClick={() => workspaceName && onDelete?.(workspaceName)}>
                                    {isDeleting ? "..." : <Trash />}
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}
