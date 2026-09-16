# Qwen Configurable Chatbot

## Run
```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Configure
Open Settings and enter:
- API Key (optional for local servers)
- Base URL, e.g. `http://localhost:8000/v1`
- Model, e.g. `Qwen/Qwen3-4B`

The endpoint must expose OpenAI-compatible:
- `GET /models`
- `POST /chat/completions`
- streaming chat completions via SSE

## Important
This version calls the model directly from the browser. Your model server/provider must allow CORS. For a public production deployment, use a backend/proxy so secret API keys are not exposed to visitors.
