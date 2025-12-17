import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "./ui/button";
import { ExternalLink, Trash } from "lucide-react";
import Link from "next/link";

export default function TableComponent({data}: {data: any}) {
    return (
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
                {data?.map((job: any) => {
                    const workspaceName = job.previewUrl.split("/").pop();

                    return (
                        <TableRow key={workspaceName}>
                            <TableCell className="font-medium"><Link className="underline" href={`/dashboard/preview/${workspaceName}`}>{workspaceName}</Link></TableCell>
                            <TableCell className="text-right">
                                <Button size={"sm"} onClick={() => window.open(job?.previewUrl, "_blank")}>
                                    <ExternalLink />
                                </Button>
                            </TableCell>
                            <TableCell className="text-right"><Button size={"sm"}><Trash /></Button></TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}
