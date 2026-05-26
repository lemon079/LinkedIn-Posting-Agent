# LinkedIn-Posting-Agent

An autonomous LangGraph-based agent that researches tech topics (Computer Science, AI, Machine Learning, etc.), drafts LinkedIn posts using Gemini 2.5 Flash, and publishes them natively to LinkedIn via the UGC Post API.

## Features
- **Autonomous Topic Selection**: Randomly selects a tech-focused genre.
- **Web Grounding**: Integrates Gemini's native Google Search tool for up-to-date research.
- **Human-in-the-Loop**: Halts the workflow and asks for CLI approval before pushing live.
- **Dry Run Mode**: Safely test generations without interacting with the LinkedIn API.

## Setup
1. Clone the repository.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in your keys (Google API, LinkedIn token/URN).
4. Run `npm start` to generate and approve a post!
