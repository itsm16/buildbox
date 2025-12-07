import CloneNode from "@/components/flow/nodes/CloneNode"
import GithubNode from "@/components/flow/nodes/GithubNode"
import TestNode from "@/components/flow/nodes/TestNode"

export const nodeTypes = {
    "test": TestNode,
    "clone": CloneNode,
    "github": GithubNode,
}