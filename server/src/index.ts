import express from 'express'
import cors from 'cors'
import {gitRouter } from './routes/gitRoutes.js'
import Docker from 'dockerode'
import {WebSocket, WebSocketServer} from 'ws'
import http from 'http'
import { JobManager } from './helpers/helpers.js'
import { projectRouter } from './routes/projectRoutes.js'
import { userRouter } from './routes/userRoutes.js'
import {config} from 'dotenv'
import { GoogleGenAI } from '@google/genai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
config();

const port = process.env.PORT || 4000;

export const docker = new Docker({ socketPath: '/var/run/docker.sock' })
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY as string});
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_KEY as string,
});

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

app.use(cors({ origin: "http://localhost:3000" }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/api", gitRouter)
app.use("/api", projectRouter)
app.use("/api", userRouter)

app.get('/', (req, res) => {
    res.send('Hello World!')
})

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url!.replace("/?", ""))
    const jobId = params.get("id")

    if (!jobId) {
        ws.close()
        return
    }

    console.log("WS connected for job:", jobId)
    JobManager.add(jobId, ws)

    ws.on("close", () => {
        console.log("WS closed for job:", jobId)
        JobManager.remove(jobId)
    })
})

server.listen(port, () => {
    console.log(`Server started on port ${port}`)
})

