import express from 'express'
import { docker } from '../index.js'
import { execInRunner, generateRandomUsername, generateShortId, JobManager } from '../helpers/helpers.js'
import { Octokit } from 'octokit'

const app = express()
export const gitRouter = express.Router()

const octokit = new Octokit({
    auth: process.env.GITHUB_ID
})

gitRouter.get("/git-check", (req, res) => {
    res.json({
        status: "success",
    })
})

gitRouter.get("/git/get-repos/:username", async (req, res) => {
    const { username } = req.params;

    try {
        const { username } = req.params;
        const repos = await octokit.request('GET /users/{username}/repos', {
            username,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        res.json({
            status: "success",
            repos: repos.data
        })
    } catch (error) {
        res.json({
            status: "error",
            error
        })
    }
})

gitRouter.get("/git/repo/:username/:repo", async (req, res) => {
    const { username, repo } = req.params;

    try {
        const repository = await octokit.request('GET /repos/{owner}/{repo}', {
            owner: username,
            repo,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        res.json({
            status: "success",
            repositoryInfo: repository.data
        })
    } catch (error) {
        res.json({
            status: "error",
            error
        })
    }
})

// change this , work on a created dir
gitRouter.post('/git/clone/:workspaceName', async (req, res) => {
    const { workspaceName } = req.params;
    const jobId = workspaceName.split("-").pop()!;
    const { cloneUrl: url } = req.body;
    const folder = `/workspace/${workspaceName}`

    if (!url) {
        return res.status(400).json({
            message: "Missing url"
        })
    }

    try {
        JobManager.send(jobId, { type: "info", data: "Checking if workspace already exists..." })
        const workspaceExists = await execInRunner(["ls", folder])

        if (!workspaceExists.toLocaleLowerCase().includes("no such file or directory")) {
            JobManager.send(jobId, { type: "error", data: 'Workspace already exists' })

            await execInRunner(["rm", `-rf`, folder])
        }

        JobManager.send(jobId, { type: "info", data: "Creating directory..." })
        const createDir = await execInRunner(["mkdir", "-p", folder], jobId)

        const cloneOutput = await execInRunner(["git", "clone", url, folder])

        res.json({
            status: "success",
            jobId,
            workspaceName,
            folder,
        })

    } catch (error: any) {
        JobManager.send(jobId, { type: "error", data: error.toString() })
        res.json({ status: "error", error })
    }
})

