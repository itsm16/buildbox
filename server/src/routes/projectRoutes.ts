import express from 'express'
import { detect, execInRunner, generateRandomUsername, generateShortId, JobManager } from '../helpers/helpers.js';
import { docker } from '../index.js';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db.js';
import { generate } from '../helpers/gemini.js';
import json5 from 'json5'

export const projectRouter = express.Router();

// serving files

// Static output candidates per framework (see detect(): vite->dist, cra->build,
// generic->dist|build|out). First existing dir wins; Next.js (.next) and backend
// projects have no servable static output.
const STATIC_CANDIDATES = ["dist", "build", "out"];

function resolveStaticDir(workspaceName: string): string | null {
    for (const dir of STATIC_CANDIDATES) {
        const folder = `/var/sandbox/workspace/${workspaceName}/${dir}`;
        try {
            if (fs.statSync(folder).isDirectory()) return folder;
        } catch { /* try next candidate */ }
    }
    return null;
}

// STATIC FILES
projectRouter.use("/preview/:workspaceName", (req, res, next) => {
    const folder = resolveStaticDir(req.params.workspaceName);
    if (!folder) return next();
    express.static(folder)(req, res, next);
});

// REDIRECT root -> trailing slash (only when slash is missing — Express matches
// trailing-slash requests too, which previously caused a self-redirect loop
// for workspaces with no static output).
projectRouter.get("/preview/:workspaceName", (req, res, next) => {
    if (req.path.endsWith("/")) return next();
    res.redirect(`/api/preview/${req.params.workspaceName}/`);
});

// SPA FALLBACK for React Router
projectRouter.get(/^\/preview\/([^/]+)\/.*$/, (req, res) => {
    const workspaceName = req.params[0] as string;
    const folder = resolveStaticDir(workspaceName);

    if (!folder) {
        return res.status(404).json({
            message: "No static build output found (looked for dist/, build/, out/). The project may have failed to build or use a non-static framework.",
        });
    }
    res.sendFile(path.join(folder, "index.html"));
});

// get user jobs
projectRouter.get("/project/user/jobs/:userId", async (req, res)=>{
    const {userId} = req.params;
    try {
        const jobs = await prisma.job.findMany({
            where:{
                request:{
                    userId: userId as string
                }
            },
            include:{
                request: true
            }
        })
        res.json({
            message: "Jobs fetched successfully",
            jobs
        })
    } catch (error:any) {
        console.log("Error:", error)
        res.status(500).json({ 
            message: "Error fetching jobs",
            error: error.message 
        });
    }
})

// project job existence check (+ disk status for idempotent preview)
// Returns { exists (db), distExists, logsTail } so frontend can skip rebuild
// and show persisted tail instead of an empty live LogViewer.
projectRouter.get("/project/job-exists/:workspaceName", async (req, res)=>{
    const { workspaceName } = req.params;
    const jobId = workspaceName.split("-").pop()!;
    const folder = `/workspace/${workspaceName}`;
    
    try {
        const jobExists = await prisma.job.findFirst({
            where:{
                request:{
                    workspaceName: workspaceName 
                }
            }
        })

        // Disk check: does a previous build output still exist in the runner?
        let distExists = false;
        try {
            const ls = await execInRunner(["sh", "-c", `for d in dist build out; do ls ${folder}/$d 2>/dev/null && break; done`]);
            distExists = !ls.toLowerCase().includes("no such file or directory") && ls.trim().length > 0;
        } catch {
            distExists = false;
        }

        const liveTail = JobManager.getLogs(jobId, 150);
        const logsTail = liveTail.length > 0 ? liveTail : (jobExists?.logs ? String(jobExists.logs).split("\n").slice(-150) : []);

        if(!jobExists){
            return res.status(200).json({
                message: "Job does not exist",
                exists: false,
                job: jobExists,
                distExists,
                logsTail,
            })
        }
        
        return res.status(200).json({
            message: "Job exists",
            exists: true,
            job: jobExists,
            distExists,
            logsTail,
        })
    } catch (error:any) {
        console.log("Error:", error)
        return res.status(500).json({
            message: "Error checking job existence",
            error: error.message
        })
    }
})

// list cloned workspaces in the runner (picker for the AI file generator)
projectRouter.get("/project/workspaces", async (req, res)=>{
    try {
        const ls = await execInRunner(["ls", "/workspace"]);
        const names = ls.split("\n")
            .map(n => n.trim())
            .filter(n => n.length > 0 && !n.includes("/") && !n.toLowerCase().includes("no such"));

        const workspaces = [];
        for (const name of names) {
            let hasPackageJson = false;
            try {
                const check = await execInRunner(["ls", `/workspace/${name}/package.json`]);
                hasPackageJson = check.includes("package.json") && !check.toLowerCase().includes("no such");
            } catch {
                hasPackageJson = false;
            }
            workspaces.push({ workspaceName: name, hasPackageJson });
        }

        res.json({ workspaces });
    } catch (error:any) {
        console.log("Error:", error)
        res.status(500).json({
            message: "Error listing workspaces",
            error: error.message
        });
    }
})

// quick setup
projectRouter.post("/project/quick-setup/:dirName", async (req, res) => {
    const { url } = req.body;
    const { dirName } = req.params;
    const jobId : string = dirName.split("-").pop()!;

    try {
        if(!url){
            return res.status(400).json({
                message: "Missing url"
            })
        }

        const folder = `/workspace/${dirName}` // jobId - i.e created from frontend when a quick sandbox or job is created
        // same jobId is named workspaceId or jobId in above preview route

        // const container = docker.getContainer("sandbox-runner");
        
        JobManager.send(jobId, { type: "info", data: "Creating folder..." })
        await execInRunner(["mkdir", "-p", folder])

        JobManager.send(jobId, { type: "info", data: "Cloning repo..." })
        const cloneOutput = await execInRunner(["git", "clone", url, folder])

        JobManager.send(jobId, {type: "info", data: "Analyzing project..."})
        const analyzed = await detect(folder, jobId)
        const outDir = analyzed?.outputDir ?? "dist";

        if (!analyzed?.build) {
            JobManager.send(jobId, { type: "error", data: "No build script found in package.json" });
            return res.status(400).json({
                message: "No build script found in package.json",
            });
        }

        JobManager.send(jobId, { type: "info", data: "Installing dependencies..." })
        const installOutput = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.install}`], jobId)

        JobManager.send(jobId, { type: "info", data: "Building project..." })
        const buildOutput = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.build}`], jobId)

        const outCheck = await execInRunner(["ls", `${folder}/${outDir}`], jobId)
        if (outCheck.toLowerCase().includes("no such file or directory") || outCheck.trim().length === 0) {
            JobManager.send(jobId, { type: "error", data: `Build produced no ${outDir}/ output` });
            return res.status(500).json({
                message: `Build produced no ${outDir}/ output`,
            });
        }

        JobManager.send(jobId, { type: "info", data: "Fixing assets paths..." })
        await execInRunner([
            "sh",
            "-c",
            `cd ${folder}/${outDir} && \
            grep -rl '"/assets/' . | xargs sed -i 's|"\/assets\/|"assets\/|g'; \
            grep -rl "'/assets/" . | xargs sed -i "s|'\/assets\/|'assets\/|g"`
        ]);

        if(analyzed?.start && analyzed?.scripts?.start){
            JobManager.send(jobId, { type: "info", data: "Starting project..." })
            const start = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.start}`], jobId)
        }

        JobManager.send(jobId, { type: "done", data: "Build completed" })

        // Prefer ngrok base when configured; otherwise return a relative path
        // and let the client resolve it against the API base (same as persistent).
        const ngrokBase = (process.env.NGROK_URL || "").trim().replace(/\/?$/, "/");
        const previewUrl = ngrokBase
            ? `${ngrokBase}api/preview/${dirName}`
            : `/api/preview/${dirName}`;

        res.json({
            jobId,
            dirName,
            previewUrl,
            outputDir: outDir,
            message: "Project setup completed",
        });

    } catch (error : any) {
        res.status(500).json({ 
            message: "Project setup failed",
            error: error.message 
        });
    }
})

// delete workspace: remove runner dir + request row (job cascades)
projectRouter.delete("/project/workspace/:workspaceName", async (req, res)=>{
    const {workspaceName} = req.params;

    if (!workspaceName || !/^[a-zA-Z0-9_-]+$/.test(workspaceName)) {
        return res.status(400).json({ message: "Invalid workspace name" });
    }

    try {
        const folder = `/workspace/${workspaceName}`;
        await execInRunner(["rm", "-rf", folder]);

        const request = await prisma.request.findFirst({ where: { workspaceName } });
        if (request) {
            await prisma.request.delete({ where: { id: request.id } });
        }

        res.json({ message: "Workspace deleted", workspaceName, hadRequest: !!request });
    } catch (error:any) {
        console.log("Error:", error)
        res.status(500).json({
            message: "Error deleting workspace",
            error: error.message
        });
    }
})

// create workspace
projectRouter.post("/project/createDir/:dirName", async (req, res)=>{
    const {dirName} = req.params;

    try {
        const folder = `/workspace/${dirName}`
        // const container = docker.getContainer("sandbox-runner");
        await execInRunner(["mkdir", "-p", folder])
        
        res.json({
            message: "Directory created",
            folder
        })

    } catch (error : any) {
        console.log("Error:", error)
        res.status(500).json({ 
            message: "Project setup failed",
            error: error.message 
        });
    }
})

// install


// build (idempotent: skips when dist already built unless force=true)
projectRouter.post("/project/build/", async (req, res)=>{
    const {workspaceName, force} = req.body;
    const jobId = workspaceName?.split("-").pop()!;
    const folder = `/workspace/${workspaceName}`

    try {
        if (!workspaceName){
            return res.status(400).json({
                message: "Missing workspace name"
            })
        }

        // Skip rebuild when output already exists in the runner container
        // (any of the static output candidates: dist/, build/, out/).
        if (!force) {
            try {
                const ls = await execInRunner(["sh", "-c", `for d in dist build out; do ls ${folder}/$d 2>/dev/null && break; done`]);
                const distExists = !ls.toLowerCase().includes("no such file or directory") && ls.trim().length > 0;
                if (distExists) {
                    const existing = await prisma.job.findFirst({
                        where: { request: { workspaceName } }
                    });
                    if (existing) {
                        return res.json({
                            message: "Build already exists, skipped",
                            skipped: true,
                            logsTail: existing.logs ? String(existing.logs).split("\n").slice(-150) : JobManager.getLogs(jobId, 150),
                        });
                    }
                }
            } catch {
                // dist missing -> fall through to full build
            }
        } else {
            JobManager.clearLogs(jobId);
        }

        JobManager.send(jobId, {type: "info", data: "Analyzing project..."})
        const analyzed = await detect(folder, jobId)
        const outDir = analyzed?.outputDir ?? "dist";

        if (!analyzed?.build) {
            JobManager.send(jobId, { type: "error", data: "No build script found in package.json" });
            return res.status(400).json({
                message: "No build script found in package.json",
            });
        }

        JobManager.send(jobId, { type: "info", data: "Installing dependencies..." })
        const installOutput = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.install}`], jobId)

        JobManager.send(jobId, { type: "info", data: "Building project..." })
        const buildOutput = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.build}`], jobId)

        JobManager.send(jobId, { type: "info", data: `Reading ${outDir} folder...` })
        const lsOutput = await execInRunner(["ls", `${folder}/${outDir}`], jobId)

        if (lsOutput.toLowerCase().includes("no such file or directory") || lsOutput.trim().length === 0) {
            JobManager.send(jobId, { type: "error", data: `Build produced no ${outDir}/ output` });
            return res.status(500).json({
                message: `Build produced no ${outDir}/ output`,
            });
        }

        // JobManager.send(jobId, { type: "info", data: `Assets found: ${lsOutput}` })
        JobManager.send(jobId, { type: "info", data: "Fixing assets paths..." })
        await execInRunner([
            "sh",
            "-c",
            `cd ${folder}/${outDir} && \
            grep -rl '"/assets/' . | xargs sed -i 's|"\/assets\/|"assets\/|g'; \
            grep -rl "'/assets/" . | xargs sed -i "s|'\/assets\/|'assets\/|g"`
        ]);
        JobManager.send(jobId, { type: "done", data: "Build completed" })

        const logsTail = JobManager.getLogs(jobId, 150);
        // Persist tail so revisits don't show an empty LogViewer.
        try {
            const existing = await prisma.job.findFirst({ where: { request: { workspaceName } } });
            if (existing) {
                await prisma.job.update({ where: { id: existing.id }, data: { logs: logsTail.join("\n").slice(-20000) } });
            }
        } catch (e) {
            console.log("Log persist skipped:", (e as Error).message);
        }

        res.json({ 
            message: "Project build completed",
            buildOutput,
            outputDir: outDir,
            logsTail,
        });

    } catch (error : any) {
        console.log("Error:", error)
        JobManager.send(jobId, { type: "error", data: error.message ?? "Build failed" });
        res.status(500).json({ 
            message: "Project build failed",
            error: error.message 
        });
    }
})

// project ai opinion (wired to frontend AI File Generator)
projectRouter.post("/project/ai/test", async (req, res)=>{
    const {workspaceName} = req.body;
    if (!workspaceName) {
        return res.status(400).json({ message: "Missing workspaceName" });
    }
    const jobId: string = String(workspaceName).split("-").pop()!;
    const folder = `/workspace/${workspaceName}`;

    try {
        JobManager.send(jobId, { type: "info", data: "Reading project for AI generation..." });
        const pkgText = await execInRunner(["cat", `${folder}/package.json`], jobId);
        const fileStructure = await execInRunner(["sh", "-c", `find ${folder}/src 2>/dev/null | head -n 200`], jobId);

        const aiOpinion = await generate({type: "docker-ci-test", pkgText, fileStructure});
        const cleaned = aiOpinion?.replace(/```json/gi, "").replace(/```/g, "").trim();
        let parsed: any = null;
        try {
            parsed = json5.parse(cleaned!);
        } catch {
            // Fall back to raw text if model didn't return strict JSON
            parsed = { raw: aiOpinion };
        }
        JobManager.send(jobId, { type: "done", data: "AI generation completed" });
        res.json({
            aiOpinion: parsed,
        });
    } catch (error: any) {
        console.log("AI generate error:", error);
        JobManager.send(jobId, { type: "error", data: error.message ?? "AI generation failed" });
        res.status(500).json({
            message: "AI generation failed",
            error: error.message,
        });
    }
})