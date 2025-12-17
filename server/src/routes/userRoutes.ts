import express from 'express'
import { prisma } from '../db.js';
import { execInRunner, JobManager } from '../helpers/helpers.js';

export const userRouter = express.Router();

//  user
userRouter.get('/user/:id', async (req, res) => {
    const userId = req.params.id;
    if(!userId){
        return res.status(400).json({ message: 'User not found' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            include:{
                accounts:true,
            }
        })

        if(!user){
            return res.status(404).json({ message: 'User not found' });
        }

        const account = user.accounts[0];

        const userDetail = {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            provider: account?.providerId,
            loginType: account?.providerId
        }

        return res.status(200).json({
            userDetail,
            message: 'User found'
        });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
})

userRouter.get("/user/:userId/jobs", async(req, res)=>{
    const { userId } = req.params;
    const jobs = await prisma.job.findMany({
        where: {
            request:{
                userId: userId
            }
        }
    })

    res.json({
        message: "Jobs fetched successfully",
        jobs
    })
})


// requests
// putting static route before dynamic route to avoid conflict
userRouter.post('/user/request', async (req, res) => {
    const { data } = req.body;
    const { workspaceName, url, repo, type, userId } = data;

    if(!workspaceName || !url || !type || !userId){
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const request = await prisma.request.create({
            data: {
                workspaceName,
                url,
                repository: repo,
                type,
                userId
            }
        })

        return res.status(200).json({
            message: 'Request created'
        })
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
})

userRouter.get("/user/:userId/request/:workspaceName", async (req, res) => {
    const {userId, workspaceName} = req.params;

    if(!userId || !workspaceName){
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const request = await prisma.request.findFirst({
            where: {
                workspaceName,
                userId
            }
        })

        if(!request){
            return res.status(404).json({ message: 'Request not found' });
        }

        return res.status(200).json({
            message: 'Request found',
            request
        })
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
})


// job

userRouter.post("/user/job", async (req, res)=>{
    const {data} = req.body;
    const {requestId, previewUrl, cloneUrl, repository} = data;

    const job = await prisma.job.create({data})

    res.status(200).json({
        message: 'Job created',
        job
    })
})