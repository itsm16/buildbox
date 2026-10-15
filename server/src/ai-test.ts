import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import { google } from './index.js';

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

export async function sdkGenerate({type, pkgText, fileStructure}: {type: string, pkgText?: any, fileStructure?: string} ){
let prompt;
if(type === "docker-ci-test"){ prompt = sysPrompts["docker-ci-test"] }

const result = await generateText({
  model: google('gemini-3.5-flash-lite'),
  messages: [
    { role: "system" as const, content: prompt as string },
    { role: "user" as const, content: `${pkgText}\n\n${fileStructure}` }
  ],
});

// for await (const textPart of result.textStream) {
//   console.log(textPart);
//   return textPart;
// }
  return result.text;

}

const pkgText = `{
  "name": "postapp-ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@emotion/react": "^11.13.0",
    "@emotion/styled": "^11.13.0",
    "@mui/material": "^5.16.5",
    "firebase": "^10.12.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-icons": "^5.2.1",
    "react-router": "^6.24.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.2",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.7",
    "vite": "^5.3.1"
  }
}`

const fileStructure = `
regulatoryflower-7433f9e5/src/App.css
regulatoryflower-7433f9e5/src/App.jsx
regulatoryflower-7433f9e5/src/assets
regulatoryflower-7433f9e5/src/assets/keyboard.png
regulatoryflower-7433f9e5/src/assets/logo.svg
regulatoryflower-7433f9e5/src/components
regulatoryflower-7433f9e5/src/components/Header
regulatoryflower-7433f9e5/src/components/Header/Header.css
regulatoryflower-7433f9e5/src/components/Header/Header.jsx
regulatoryflower-7433f9e5/src/components/Header/Icon
regulatoryflower-7433f9e5/src/components/Header/Icon/Icon.css
regulatoryflower-7433f9e5/src/components/Header/Icon/Icon.jsx
regulatoryflower-7433f9e5/src/components/Hero
regulatoryflower-7433f9e5/src/components/Hero/Feed
regulatoryflower-7433f9e5/src/components/Hero/Feed/Feed.css
regulatoryflower-7433f9e5/src/components/Hero/Feed/Feed.jsx
regulatoryflower-7433f9e5/src/components/Hero/Feed/leaves.jpg
regulatoryflower-7433f9e5/src/components/Hero/Feed/mcwhale.jpg
regulatoryflower-7433f9e5/src/components/Hero/Feed/mountains.jpeg
regulatoryflower-7433f9e5/src/components/Hero/Feed/rain.jpg
regulatoryflower-7433f9e5/src/components/Hero/Feed/user.png
regulatoryflower-7433f9e5/src/components/Hero/Hero.css
regulatoryflower-7433f9e5/src/components/Hero/Hero.jsx
regulatoryflower-7433f9e5/src/components/Hero/Modal
regulatoryflower-7433f9e5/src/components/Hero/Modal/Modal.css
regulatoryflower-7433f9e5/src/components/Hero/Modal/Modal.jsx
regulatoryflower-7433f9e5/src/components/Hero/Post
regulatoryflower-7433f9e5/src/components/Hero/Post/Post.css
regulatoryflower-7433f9e5/src/components/Hero/Post/Post.jsx
regulatoryflower-7433f9e5/src/components/User
regulatoryflower-7433f9e5/src/components/User/User.css
regulatoryflower-7433f9e5/src/components/User/User.jsx
regulatoryflower-7433f9e5/src/firebase
regulatoryflower-7433f9e5/src/firebase/db.js
regulatoryflower-7433f9e5/src/firebase/firebase.js
regulatoryflower-7433f9e5/src/index.css
regulatoryflower-7433f9e5/src/main.jsx

`
