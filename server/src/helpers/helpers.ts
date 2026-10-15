import { docker } from "../index.js"
import type { Exec, Container } from "dockerode"
import type { Duplex } from "stream"
import { v4 as uuidv4 } from 'uuid'
import { generateUsername } from 'unique-username-generator'
import type { WebSocket } from "ws"

import { PassThrough } from "stream";
import { start } from "repl"

export async function execInRunner(cmd: string[], jobId?: string): Promise<string> {
    const container = docker.getContainer("sandbox-runner");

    const exec = await container.exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
        // Tty: true,
        WorkingDir: "/workspace"
    });

    return new Promise((resolve, reject) => {
        exec.start({ hijack: true, stdin: false }, (err: Error | null, stream: any) => {
            if (err) return reject(err);

            let output = "";

            const stdout = new PassThrough();
            const stderr = new PassThrough();

            // ⬅️ This removes the control bytes (demux)
            docker.modem.demuxStream(stream, stdout, stderr);

            const handleChunk = (chunk: Buffer) => {
                const text = chunk.toString();
                output += text;

                if (jobId) {
                    JobManager.send(jobId, {
                        type: "log",
                        data: text        // Clean log lines
                    });
                }
            };

            stdout.on("data", handleChunk);
            stderr.on("data", handleChunk);

            stream.on("end", () => {
                if (jobId) {
                    JobManager.send(jobId, {
                        type: "complete",
                        // data: output
                    });
                }
                resolve(output);
            });
            stream.on("error", reject);
        });
    });
}

export async function detect(dir: string, jobId?: string) {
    if (!dir) return null;
    const workspaceName = dir.split("/").pop();

    try {
        await execInRunner(["test", "-f", `${dir}/package.json`], jobId);

        const pkgText = await execInRunner(["cat", `${dir}/package.json`], jobId);
        const pkg = JSON.parse(pkgText);

        let packageManager = "npm";
        const lockFiles = await execInRunner(["ls", dir], jobId);

        if (lockFiles.includes("pnpm-lock.yaml")) packageManager = "pnpm";
        else if (lockFiles.includes("yarn.lock")) packageManager = "yarn";
        else if (lockFiles.includes("package-lock.json")) packageManager = "npm";

        let framework = "generic";

        const files = lockFiles.split("\n");

        const has = (f: string) => files.includes(f);

        if (has("next.config.js") || has("next.config.mjs")) {
            framework = "next";
        } else if (has("vite.config.js") || has("vite.config.ts")) {
            framework = "vite";
        } else if (has("astro.config.mjs") || has("astro.config.ts")) {
            framework = "astro";
        } else if (has("nuxt.config.js") || has("nuxt.config.ts")) {
            framework = "nuxt";
        } else if (pkg.dependencies?.["react-scripts"]) {
            framework = "cra";
        } else if (pkg.dependencies?.expo) {
            framework = "expo";
        }

        // backend
        if (pkg.dependencies?.express) {
            framework = "express";
        }

        else if (pkg.dependencies?.["@nestjs/core"]) {
            framework = "nestjs";
        }

        else if (pkg.dependencies?.fastify) {
            framework = "fastify";
        }

        else if (pkg.dependencies?.koa) {
            framework = "koa";
        }

        else if (pkg.dependencies?.hapi) {
            framework = "hapi";
        }

        else if (pkg.dependencies?.["@adonisjs/core"]) {
            framework = "adonis";
        }

        const scripts = pkg.scripts || {};

        const script = (name: string) =>
            scripts[name] ? `${packageManager} run ${name}` : null;

        // Install always:
        const install = `${packageManager} install`;

        // Build detection:
        let build = script("build") || script("compile") || script("prepare");

        // backend
        // Output dir (framework-specific defaults)
        let start = script("start");
        if (!start) {
            // typical Node entrypoints
            const possibleEntrypoints = ["server.js", "index.js", "app.js", "main.js"];
            for (const file of possibleEntrypoints) {
                try {
                    await execInRunner(["test", "-f", `${dir}/${file}`], jobId);
                    start = `node ${file}`;
                    break;
                } catch { }
            }
        }

        let outputDir = null;

        if (framework === "next") outputDir = ".next";
        if (framework === "vite") outputDir = "dist";
        if (framework === "cra") outputDir = "build";
        if (framework === "astro") outputDir = "dist";

        // If generic, try to infer output:
        if (!outputDir) {
            const commonDirs = await execInRunner(["ls", dir], jobId);

            if (commonDirs.includes("dist")) outputDir = "dist";
            else if (commonDirs.includes("build")) outputDir = "build";
            else if (commonDirs.includes("out")) outputDir = "out";
        }

        return {
            workspace: workspaceName,
            packageManager,
            framework,
            install,
            build,
            start,
            scripts,
            outputDir
        };

    } catch (err) {
        // No package.json → not a Node project
        return {
            workspace: workspaceName,
            packageManager: null,
            framework: null,
            install: null,
            build: null,
            start: null,
            scripts: {},
            outputDir: null
        };
    }
}

export function generateId() {
    return uuidv4()
}

export function generateShortId() {
    return uuidv4().slice(0, 8)
}

export function generateRandomUsername() {
    return generateUsername('-')
}

export function stripAnsi(str: string): string {
    // Remove ANSI color/control sequences + carriage returns
    return str
        .replace(/\x1B\[[0-9;]*[mGKHF]/g, "")
        .replace(/\x1B\][^\x07]*\x07/g, "")
        .replace(/\r/g, "")
}

const MAX_LOG_LINES = 500;

export const JobManager = {
    clients: new Map<string, WebSocket>(),
    logs: new Map<string, string[]>(),

    add(jobId: string, ws: WebSocket) {
        this.clients.set(jobId, ws)
    },

    remove(jobId: string) {
        this.clients.delete(jobId)
    },

    send(jobId: string, data: any) {
        // Persist stripped log lines for revisit (tail) — skip empty `complete` events
        if (data?.data) {
            const clean = stripAnsi(String(data.data))
            const lines = clean.split("\n").map(l => l.trimEnd()).filter(l => l.length > 0)
            if (lines.length > 0) {
                const prev = this.logs.get(jobId) ?? []
                const next = [...prev, `[${data.type}] ${lines.join("\n")}`.slice(0, 2000)]
                // keep flat per-line for easier tail slicing
                const flat: string[] = []
                for (const entry of next) {
                    for (const l of entry.split("\n")) flat.push(l)
                }
                this.logs.set(jobId, flat.slice(-MAX_LOG_LINES))
            }
        }
        const ws = this.clients.get(jobId)
        if (!ws || ws.readyState !== ws.OPEN) return
        ws.send(JSON.stringify(data))
    },

    getLogs(jobId: string, tail = 150): string[] {
        const all = this.logs.get(jobId) ?? []
        return all.slice(-tail)
    },

    clearLogs(jobId: string) {
        this.logs.delete(jobId)
    }
}

