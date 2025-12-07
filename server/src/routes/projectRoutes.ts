import express from 'express'
import { detect, execInRunner, generateRandomUsername, generateShortId, JobManager } from '../helpers/helpers.js';
import { docker } from '../index.js';
import path from 'path';
import { prisma } from '../db.js';
import { generate } from '../helpers/gemini.js';
import json5 from 'json5'

export const projectRouter = express.Router();

// serving files

// STATIC FILES
projectRouter.use("/preview/:workspaceName", (req, res, next) => {
    const folder = `/var/sandbox/workspace/${req.params.workspaceName}/dist`;
    express.static(folder)(req, res, next);
});

// REDIRECT root -> trailing slash
projectRouter.get("/preview/:workspaceName", (req, res) => {
    res.redirect(`/api/preview/${req.params.workspaceName}/`);
});

// SPA FALLBACK for React Router
projectRouter.get(/^\/preview\/([^/]+)\/.*$/, (req, res) => {
    const workspaceName = req.params[0];
    const folder = `/var/sandbox/workspace/${workspaceName}/dist`;

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

// project job existence check
projectRouter.get("/project/job-exists/:workspaceName", async (req, res)=>{
    const { workspaceName } = req.params;
    
    try {
        const jobExists = await prisma.job.findFirst({
            where:{
                request:{
                    workspaceName: workspaceName 
                }
            }
        })

        if(!jobExists){
            return res.status(200).json({
                message: "Job does not exist",
                exists: false,
                job: jobExists
            })
        }
        
        return res.status(200).json({
            message: "Job exists",
            exists: true,
            job: jobExists
        })
    } catch (error:any) {
        console.log("Error:", error)
        return res.status(500).json({
            message: "Error checking job existence",
            error: error.message
        })
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

        JobManager.send(jobId, { type: "info", data: "Installing dependencies..." })
        const installOutput = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.install}`], jobId)

        if(analyzed?.build && analyzed?.scripts?.build){
        JobManager.send(jobId, { type: "info", data: "Building project..." })
        const buildOutput = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.build}`], jobId)
        }

        // JobManager.send(jobId, { type: "info", data: "Fixing assets paths..." })
        // await execInRunner([
        //     "sh",
        //     "-c",
        //     `cd ${folder}/dist && \
        //     grep -rl '"/assets/' . | xargs sed -i 's|"\/assets\/|"assets\/|g'; \
        //     grep -rl "'/assets/" . | xargs sed -i "s|'\/assets\/|'assets\/|g"`
        // ]);

        if(analyzed?.start && analyzed?.scripts?.start){
            JobManager.send(jobId, { type: "info", data: "Starting project..." })
            const start = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.start}`], jobId)
        }

        JobManager.send(jobId, { type: "done", data: "Build completed" })

        res.json({
            jobId,
            dirName,
            previewUrl: `${process.env.NGROK_URL}api/preview/${dirName}`,
            message: "Project setup completed",
        });

    } catch (error : any) {
        res.status(500).json({ 
            message: "Project setup failed",
            error: error.message 
        });
    }
})

// create workspace
projectRouter.post("/project/createDir/:dirName", async (req, res)=>{
    const {dirName} = req.params;

    try {
        const folder = `/workspace/${dirName}`
        const container = docker.getContainer("sandbox-runner");
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


// build
projectRouter.post("/project/build/", async (req, res)=>{
    const {workspaceName} = req.body;
    const jobId = workspaceName.split("-").pop()!;
    const folder = `/workspace/${workspaceName}`

    try {
        if (!workspaceName){
            return res.status(400).json({
                message: "Missing workspace name"
            })
        }

        JobManager.send(jobId, {type: "info", data: "Analyzing project..."})
        const analyzed = await detect(folder, jobId)

        JobManager.send(jobId, { type: "info", data: "Installing dependencies..." })
        const installOutput = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.install}`], jobId)

        JobManager.send(jobId, { type: "info", data: "Building project..." })
        const buildOutput = await execInRunner(["sh", "-c", `cd ${folder} && ${analyzed?.build}`], jobId)

        // // add conditions to check if build was successful or any errors
        // // then send appropriate messages or res
        

        JobManager.send(jobId, { type: "info", data: "Reading dist folder..." })
        const lsOutput = await execInRunner(["ls", `${folder}/dist`], jobId)

        // JobManager.send(jobId, { type: "info", data: `Assets found: ${lsOutput}` })
        JobManager.send(jobId, { type: "info", data: "Fixing assets paths..." })
        await execInRunner([
            "sh",
            "-c",
            `cd ${folder}/dist && \
            grep -rl '"/assets/' . | xargs sed -i 's|"\/assets\/|"assets\/|g'; \
            grep -rl "'/assets/" . | xargs sed -i "s|'\/assets\/|'assets\/|g"`
        ]);
        JobManager.send(jobId, { type: "done", data: "Build completed" })

        res.json({ 
            message: "Project build completed",
            buildOutput 
        });

    } catch (error : any) {
        console.log("Error:", error)
        res.status(500).json({ 
            message: "Project build failed",
            error: error.message 
        });
    }
})

// project ai opinion

projectRouter.post("/project/ai/test", async (req, res)=>{
    const {workspaceName} = req.body;
    // const workspace = `workspace/${workspaceName}`

    // const lsOutput = await execInRunner(["ls", workspace], workspaceName)
    const pkgText = await execInRunner(["cat", `${workspaceName}/package.json`])
    const fileStructure = await execInRunner(["find", `${workspaceName}/src`])

    console.log("pkgText", pkgText)
    console.log("fileStructure", fileStructure)

    const aiOpinion = await generate({type: "docker-ci-test", pkgText, fileStructure});
    // const aiOpinionStream = await sdkGenerate({type: "docker-ci-test", pkgText, fileStructure});
    const cleaned = aiOpinion?.replace("```json", "").replace("```", "");
    const parsed = json5.parse(cleaned!)
    res.json({
        aiOpinion: parsed,
    })
})