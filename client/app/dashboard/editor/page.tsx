
"use client"
import Editor from "@/components/Editor";
import { Edge } from "@xyflow/react";
import { useParams, usePathname, useRouter } from "next/navigation";

const initialEdges: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];

export default function page() {
    // fetch nodes and edges from id

    return (
    <>
    {/* <Editor initialNodes={givenNodes} initialEdges={givenEdges} /> */}
    </>
    )
}