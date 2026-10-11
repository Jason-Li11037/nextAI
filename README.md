# nextAI

A full-stack AI application for asking questions about an uploaded PDF, rebuilt as a reproduction of a project I made earlier.

## Tech stack

- React 18 (Create React App), Ant Design and axios for the client
- Node.js 20+ and Express for the API
- LangChain for retrieval-augmented generation (RAG)
- OpenAI for embeddings and the chat model
- multer for file uploads

## Project structure

```
public/              # static files of the React app
src/
├── App.js           # page layout and conversation state
├── index.js         # React entry point
└── components/
    ├── PdfUploader.js    # drag-and-drop upload to POST /upload
    ├── ChatComponent.js  # question input, calls GET /chat
    └── RenderQA.js       # renders the questions and answers
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
npm install                          # client dependencies
cd server && npm install --legacy-peer-deps && cd ..
cp server/.env.example server/.env   # then put your own API key into server/.env
npm run dev                          # client on http://localhost:3000, API on http://localhost:5001
```

Other scripts:

- `npm start` runs only the client, `npm run server` runs only the API.
- `npm run build` creates the production build of the client in `build/`.

## Configuration

Set these in `server/.env`:

| Variable | Description | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API key used for embeddings and the chat model | none (required for `/chat`) |

## API and features

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/upload` | `multipart/form-data` with a `file` field. Saves the file to `server/uploads/` and uses it for later questions. |
| `GET` | `/chat?question=<text>` | Answers the question about the most recently uploaded file and returns `{ ragAnswer, mcpAnswer }`. `mcpAnswer` is currently the fixed string `"N/A"`. |

```bash
curl -F "file=@/path/to/your.pdf" http://localhost:5001/upload
curl -G --data-urlencode "question=What is this document about?" http://localhost:5001/chat
```

The client:

- uploads one or several files by clicking or dragging them onto the upload area
- sends a question with the Ask button and shows it together with the two answers
- shows a spinner while an answer is loading

Notes:

- The client calls the API at `http://localhost:5001` (set in `PdfUploader.js` and `ChatComponent.js`).
- Before any upload, `/chat` falls back to `server/uploads/sample.pdf`, which is not included. If that file is missing, the request throws and the Express 4 process exits, so upload a file first.
- Every question loads, splits and embeds the document again.
- Dependency versions follow the original project. `multer` 1.x has published security advisories.
- `typescript` is pinned to 4.x because `react-scripts` 5.0.1 only supports TypeScript 3 and 4. With a newer major version the lint step of `npm run build` fails.

## Progress

- [x] Express backend: PDF upload and RAG question answering
- [x] React client: upload, ask questions and show the answers
- [ ] Voice mode: speech recognition and speech synthesis
- [ ] Web search answers through an MCP server and client
- [ ] Demo documentation and deployment notes
- [ ] Modernize the stack: Express 5, multer 2, Vite, React 19, native speech synthesis, configurable chat model
