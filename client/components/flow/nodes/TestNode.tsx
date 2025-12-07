import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Handle } from "@xyflow/react";
import { IoLogoGithub } from "react-icons/io";
import { useEffect } from "react";

export default function TestNode({ data }: { data: { loading: boolean }, label: string }) {

    return (
        <Card className="h-[90px] w-[260px] rounded-sm py-3 px-2 border-black">
            <div className="flex w-full h-full items-center relative">
                <div className="absolute top-0 left-0 bg-red-500 w-[6px] h-[6px] rounded-[1.5px]"></div>
                {data.loading && <Spinner className="absolute bottom-0 right-0 size-3"/>}

                <div className="w-[30%] flex justify-center"><IoLogoGithub size={35} /></div>
                <div className="w-[70%] text-sm flex flex-col h-full gap-1 py-1">
                    <div className="h-[20%] text-sm">Test</div>
                    <div className="h-[80%] text-gray-400 text-xs">
                        Test Node
                    </div>
                </div>
            </div>
            <Handle
            type="target"
            position="top"
            />
            <Handle
            type="source"
            position="bottom"
            />
        </Card>
    )
}