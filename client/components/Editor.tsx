"use client"
import { useState, useCallback, useEffect } from "react";
import FlowCanvas from "@/components/flow/FlowCanvas";
import { IoIosPlay } from "react-icons/io";
import { Edge, Node, useReactFlow } from '@xyflow/react';
import { useModalStore } from "@/store/modal-store";
import Modal from "./Modal";

export default function Editor({ initialNodes, initialEdges }: { initialNodes: Node[], initialEdges: Edge[] }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const cloneModalOpen = useModalStore(state => state.cloneModalOpen);
  const reactFlowInstance = useReactFlow();

  const setCloneModalOpen = useModalStore(state => state.setCloneModalOpen);

  const handlePlay = useCallback(async () => {
    console.log("Play");

    const nodesSnapshot = reactFlowInstance.getNodes();

    const waitForFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    const setNodeLoading = (nodes, nodeId, loading) => {
      return nodes.map((n: Node) =>
        n.id === nodeId ? { ...n, data: { ...n.data, loading } } : n
      );
    };
    await sleep(1000); // 1 second


    for (const node of nodesSnapshot) {
      let url: string | null = null;

      // Turn loading ON
      setNodes((prev) => setNodeLoading(prev, node.id, true));
      await waitForFrame();
      console.log(`Started loading for node ${node.id}`);

      if (node.type === "github") {
        url = "https://jsonplaceholder.typicode.com/todos/1";
        try {
          const resp = await fetch(url);
          const json = await resp.json();
          console.log(`Response for ${node.id}:`, json);

          // 👇 Add artificial delay so loading is visible
          // await sleep(1000); // 1 second
        } catch (err) {
          console.error(`Error for node ${node.id}:`, err);
        }
      } else if (node.type === "clone") {
        setCloneModalOpen(true);
      }
      else if (node.type === "test") {
        url = "https://jsonplaceholder.typicode.com/todos/2";
        try {
          const resp = await fetch(url);
          const json = await resp.json();
          console.log(`Response for ${node.id}:`, json);

          // 👇 Add artificial delay so loading is visible
          // await sleep(1000); // 1 second
        } catch (err) {
          console.error(`Error for node ${node.id}:`, err);
        }
      } else {
        continue;
      }


      // Turn loading OFF
      setNodes((prev) => setNodeLoading(prev, node.id, false));
      // await waitForFrame();
      console.log(`Finished loading for node ${node.id}`);
    }

    console.log("✅ All nodes processed");
  }, [reactFlowInstance, setNodes]);


  return (
    <div className="flex flex-col gap-1" style={{ height: "calc(100vh - 30px)" }}>
      {/* Nav */}
      <div className="px-8 border-b h-[40px] w-[90%] md:w-[80%] lg:w-[60%] self-center flex items-center justify-between">
        <div className="cursor-pointer">Demo</div>
        <div className="flex gap-1 text-black">
          <button
            onClick={handlePlay}
            className="w-fit p-1 hover:bg-gray-200 rounded-sm cursor-pointer"
          >
            <IoIosPlay size={18} />
          </button>
        </div>
      </div>
      {/* Canvas */}
      <div className="flex flex-col h-full text-sm">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          setNodes={setNodes}
          setEdges={setEdges}
        />
      {cloneModalOpen && <Modal open={cloneModalOpen} setOpen={setCloneModalOpen}/>}
      </div>
    </div>
  );
}