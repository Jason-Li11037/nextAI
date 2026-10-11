# nextAI

A full-stack AI application for asking questions about an uploaded PDF, rebuilt as a reproduction of a project I made earlier.

## Tech stack

- Node.js 20+ and Express
- LangChain for retrieval-augmented generation (RAG)
- OpenAI for embeddings and the chat model
- multer for file uploads

## Project structure

```
server/
├── server.js        # Express app: POST /upload and GET /chat
├── chat.js          # RAG pipeline: load, split, embed, retrieve, answer
├── package.json
├── .env.example     # template for the environment variables
└── uploads/         # uploaded files (contents are git-ignored)
```

## Getting started

Requirements: Node.js 20 or later and an OpenAI API key.

```bash
cd server
npm install --legacy-peer-deps
cp .env.example .env   # then put your own API key into .env
npm start              # http://localhost:5001
```

The server listens on port 5001 (set in `server.js`).

## Configuration

Set these in `server/.env`:

| Variable | Description | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API key used for embeddings and the chat model | none (required for `/chat`) |

## API

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/upload` | `multipart/form-data` with a `file` field. Saves the file to `server/uploads/` and uses it for later questions. |
| `GET` | `/chat?question=<text>` | Answers the question about the most recently uploaded file and returns `{ ragAnswer, mcpAnswer }`. `mcpAnswer` is currently the fixed string `"N/A"`. |

```bash
curl -F "file=@/path/to/your.pdf" http://localhost:5001/upload
curl -G --data-urlencode "question=What is this document about?" http://localhost:5001/chat
```

Notes:

- Before any upload, `/chat` falls back to `server/uploads/sample.pdf`, which is not included. If that file is missing, the request throws and the Express 4 process exits, so upload a file first.
- Every question loads, splits and embeds the document again.
- Dependency versions follow the original project. `multer` 1.x has published security advisories.

## Progress

- [x] Express backend: PDF upload and RAG question answering
- [ ] React client: upload, ask questions and show the answers
- [ ] Voice mode: speech recognition and speech synthesis
- [ ] Web search answers through an MCP server and client
- [ ] Demo documentation and deployment notes
- [ ] Modernize the stack: Express 5, multer 2, Vite, React 19, native speech synthesis, configurable chat model
