
"use client"
import Editor from "@/components/Editor";
import { Edge } from "@xyflow/react";
import { useParams, usePathname, useRouter } from "next/navigation";

const initialNodes = [
  {
    id: 'n1',
    position: { x: 0, y: 0 },
    data: { label: 'Node 1', loading: false },
    type: 'clone'
  },
  {
    id: 'n2',
    position: { x: -150, y: 200 },
    data: { label: 'Node 2', loading: false },
    type: 'test'
  }
];

const initialEdges: Edge[] = [{ id: 'e1', source: 'n1', target: 'n2' }];

export default function page() {

    return (
    <>
    <Editor initialNodes={initialNodes} initialEdges={initialEdges} />
    </>
    )
}