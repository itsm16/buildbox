"use client"
import axios, { AxiosHeaders } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// methods
async function get(url:string) {
    const res = await axios.get(`${API_BASE_URL}/api/${url}`, {headers: {Authorization: "jsd"}});
    return res;
}

async function post(url:string, data: any) {
    const res = await axios.post(`${API_BASE_URL}/api/${url}`, {data, headers: {Authorization: "jsd"}});
    return res;
}



// ws
export async function connectToRunner(jobId: string) {
    try {
        const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        const ws = new WebSocket(`${wsUrl}/?id=${jobId}`);
        return ws;
    } catch (error) {
        console.error('Error connecting to runner:', error);
        throw error;
    }
}


// user queries

export async function getUserById(userId: string) {
    try {
        // const response = await axios.get(`${API_BASE_URL}/api/user/${userId}`, {headers: {Authorization: "jsd"}});
        const response = await get(`user/${userId}`)
        return response.data;
    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
}

export async function getUserJobs(userId : string) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/project/user/jobs/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error getting user jobs:', error);
        throw error;
    }
}

export async function createRequest({workspaceName, url, repo, type, userId}: {workspaceName: string, url: string, repo: string, type: string, userId: string}) {
    try {
        // const response = await axios.post(`${API_BASE_URL}/api/user/request`, {workspaceName, url, repo, type, userId});
        const response = await post("user/request", {workspaceName, url, repo, type, userId})
        return response.data;
    } catch (error) {
        console.error('Error creating request:', error);
        throw error;
    }
}

export async function getUserRequest(userId : string, workspaceName : string) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/user/${userId}/request/${workspaceName}`);
        return response.data;
    } catch (error) {
        console.error('Error getting user request:', error);
        throw error;
    }
}

// job
export async function createJob({requestId, previewUrl, cloneUrl, repository}: {
    requestId: string,
    previewUrl: string,
    cloneUrl: string,
    repository: string
}) {
    try {
        const response = await post("user/job", {requestId, previewUrl, cloneUrl, repository})
        return response.data;
    } catch (error) {
        console.error('Error creating job:', error);
        throw error;
    }
}

export async function getJobs(userId: string) {
    try {
        const res = await get(`user/${userId}/jobs`)
        return res.data;
    } catch (error) {
        console.error('Error getting jobs:', error);
        throw error;
    }
}

export async function checkJobExists(workspaceName : string) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/project/job-exists/${workspaceName}`);
        return response.data;
    } catch (error) {
        console.error('Error checking job existence:', error);
        throw error;
    }
}

// project queries

export async function postRepoUrl({ url, dirName }: { url: string, dirName: string }) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/project/quick-setup/${dirName}`, { url });
        return response.data;
    } catch (error) {
        console.error('Error cloning repository:', error);
        throw error;
    }
}

export async function deleteWorkspace(workspaceName : string) {
    try {
        const response = await axios.delete(`${API_BASE_URL}/api/project/workspace/${workspaceName}`)
        return response.data
    } catch (error) {
        console.error('Error deleting workspace:', error);
        throw error;
    }
}

export async function createDir(dirName : string) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/project/createDir/${dirName}`)
        return response.data
    } catch (error) {
        console.error('Error getting user:', error);
        throw error;
    }
}

export async function mkdirAndCloneRepo({cloneUrl, workspaceName}: {cloneUrl: string, workspaceName: string}) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/git/clone/${workspaceName}`, { cloneUrl })
        return response.data
    } catch (error) {
        console.error('Error cloning repo:', error);
        throw error;
    }
}

export async function getUserRepos(username : string) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/git/get-repos/${username}`);
        return response.data;
    } catch (error) {
        console.error('Error getting user repos:', error);
        throw error;
    }
}

export async function getSingleRepo({username, repo} : {username: string, repo: string}) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/git/repo/${username}/${repo}`);
        return response.data;
    } catch (error) {
        console.error('Error getting user repos:', error);
        throw error;
    }
}

export async function runBuild(workspaceName : string, force?: boolean) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/project/build`, { workspaceName, force: !!force })
        return response.data
    } catch (error) {
        console.error('Error building project:', error);
        throw error;
    }
}

export async function getWorkspaces() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/project/workspaces`);
        return response.data;
    } catch (error) {
        console.error('Error listing workspaces:', error);
        throw error;
    }
}

export async function generateAiFiles(workspaceName : string) {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/project/ai/test`, { workspaceName })
        return response.data
    } catch (error) {
        console.error('Error generating AI files:', error);
        throw error;
    }
}
