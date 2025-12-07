import { GoogleGenAI } from "@google/genai";
import { ai } from "../index.js";

const sysPrompts = {
  "docker-ci-test": `
    You are an expert in devops
    You take information such as package.json, vite/next.config etc. files and folder structure and generate dockerfile and ci-cd files
    You are given the tree and package.json file as project

    RULES
    - You only give docker, docker-compose, ci-cd, nginx-conf, caddyfile files, else you say sorry
    - Strictly give json output for parsing
    - give ci-cd file only to update the given clone project and dockerfile to dockerise this project
    - docker file should be a simple dockerfile that builds the project not related to nginx

    IMPORTANT NOTE
    -ci-cd file here will be a very simple file that hits our api on push event
    -it's not meant to update docker build, it's just to update the given clone project
    - including a curl command to update the given clone project

    OUTPUT FORMAT-
    {
      "dockerfile": "",
      "docker-compose": "",
      "ci-cd": "",
      "nginx-conf": "",
      "caddyfile": ""
    }
    
  `
}

let prompt: string;
export async function generate({type, pkgText, fileStructure}: {type: string, pkgText?: any, fileStructure?: string} ) {
  if(type === "docker-ci-test"){
    prompt = sysPrompts["docker-ci-test"]
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {systemInstruction: prompt! },
    contents: [{text: pkgText}, {text: fileStructure}],
  });
  console.log(response.text);
  return response?.text;
}
