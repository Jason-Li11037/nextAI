# nextAI

A full-stack AI application for asking questions about an uploaded PDF, rebuilt as a reproduction of a project I made earlier.

## Tech stack

- React 18 (Create React App), Ant Design and axios for the client
- react-speech-recognition and speak-tts for the voice mode
- Node.js 20+ and Express for the API
- LangChain for retrieval-augmented generation (RAG)
- OpenAI for embeddings and the chat model
- Model Context Protocol (MCP) SDK and SerpApi for the web search answer
- multer for file uploads

## Project structure

```
public/              # static files of the React app
src/
├── App.js           # page layout and conversation state
├── index.js         # React entry point
└── components/
    ├── PdfUploader.js    # drag-and-drop upload to POST /upload
    ├── ChatComponent.js  # question input and voice mode, calls GET /chat
    └── RenderQA.js       # renders the questions and answers
docs/                # architecture, run guide with demo script, deployment notes
server/
├── server.js        # Express app: POST /upload and GET /chat
├── chat.js          # RAG pipeline: load, split, embed, retrieve, answer
├── chat-mcp.js      # MCP client: calls the search tool and summarises the results
├── mcp-server.js    # MCP server (started as a child process) with the search_web tool
├── package.json
├── .env.example     # template for the environment variables
└── uploads/         # uploaded files (contents are git-ignored)
```

## Getting started

Requirements: Node.js 20 or later, an OpenAI API key and a SerpApi API key (serpapi.com).

```bash
npm install                          # client dependencies
cd server && npm install --legacy-peer-deps && cd ..
cp server/.env.example server/.env   # then put your own API keys into server/.env
npm run dev                          # client on http://localhost:3000, API on http://localhost:5001
```

Other scripts:

- `npm start` runs only the client, `npm run server` runs only the API.
- `npm run build` creates the production build of the client in `build/`.

More documentation:

- [Run guide and demo script](docs/demo.md): setup in detail, a quick check, a five-minute demo and troubleshooting
- [Architecture](docs/architecture.md): components, diagrams, design limits and measured failure behaviour
- [Deployment notes](docs/deployment.md): optional and untested, with what the code needs and a non-functional checklist

## Configuration

Set these in `server/.env`:

| Variable | Description | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API key used for embeddings and the chat model | none (required for `/chat`) |
| `SERPAPI_KEY` | SerpApi API key used by the search tool of the MCP server | none (required for `/chat`) |

## API and features

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/upload` | `multipart/form-data` with a `file` field. Saves the file to `server/uploads/` and uses it for later questions. |
| `GET` | `/chat?question=<text>` | Returns `{ ragAnswer, mcpAnswer }`. `ragAnswer` answers the question from the most recently uploaded file. `mcpAnswer` summarises a web search for the question, made through the MCP search tool. |

```bash
curl -F "file=@/path/to/your.pdf" http://localhost:5001/upload
curl -G --data-urlencode "question=What is this document about?" http://localhost:5001/chat
```

The client:

- uploads one or several files by clicking or dragging them onto the upload area
- sends a question with the Ask button and shows it together with the two answers
- shows a spinner while an answer is loading
- has a voice mode: the `Chat Mode` button replaces the text input with a record button, turns what you say into a question and reads the document answer aloud

Notes:

- Voice mode needs a browser that supports the Web Speech API (Chromium-based browsers such as Chrome or Edge), microphone permission, and a secure context (`https` or `localhost`). The configured voice, `Google US English`, is available in Chrome.
- The client calls the API at `http://localhost:5001` (set in `PdfUploader.js` and `ChatComponent.js`).
- Before any upload, `/chat` falls back to `server/uploads/sample.pdf`, which is not included. If that file is missing, the request throws and the Express 4 process exits, so upload a file first.
- `server/chat-mcp.js` starts `server/mcp-server.js` as a child process (stdio) on the first question and reuses it. Every question calls the `search_web` tool once (5 results) and asks the model to summarise them.
- `/chat` runs the document answer first and then the web search answer. If an OpenAI request fails (for example with a wrong key or without network access) or the search server cannot be started, the request throws and the Express 4 process exits. A failing web search does not throw: the search tool returns the error text and the model summarises it, so `mcpAnswer` then contains that text.
- Every question loads, splits and embeds the document again.
- Dependency versions follow the original project. `multer` 1.x has published security advisories.
- `typescript` is pinned to 4.x because `react-scripts` 5.0.1 only supports TypeScript 3 and 4. With a newer major version the lint step of `npm run build` fails.
- `npm run build` prints three ESLint warnings for `ChatComponent.js` (two unused variables and a `useEffect` dependency). The build succeeds, but with `CI=true` (warnings treated as errors) it fails; use `CI=false npm run build` where the environment sets `CI=true`.

## Progress

- [x] Express backend: PDF upload and RAG question answering
- [x] React client: upload, ask questions and show the answers
- [x] Voice mode: speech recognition and speech synthesis
- [x] Web search answers through an MCP server and client
- [x] Demo documentation and deployment notes
- [ ] Modernize the stack: Express 5, multer 2, Vite, React 19, native speech synthesis, configurable chat model
