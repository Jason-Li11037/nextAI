# Architecture

This page describes how the pieces of nextAI fit together and what happens when you ask a question.

## Components

| Component | Location | Responsibility |
| --- | --- | --- |
| React client | `src/` | Upload area, question input, answer list and the voice mode. Talks to the API over HTTP. |
| Express API | `server/server.js` | Two routes, `POST /upload` and `GET /chat`. Keeps the path of the latest uploaded file in memory. |
| RAG pipeline | `server/chat.js` | Loads the PDF, splits it, embeds the chunks, retrieves the best chunks for the question and asks the chat model. |
| MCP client | `server/chat-mcp.js` | Starts the MCP server as a child process on the first question, calls its search tool and asks the chat model to summarise the results. |
| MCP server | `server/mcp-server.js` | Exposes one tool, `search_web`, which queries SerpApi. Talks to the client over stdio. |
| OpenAI | external | Embeddings (`OpenAIEmbeddings`) and the chat model (`gpt-5`, used by both answers). |
| SerpApi | external | Google search results for the web search answer. |

## System overview

```mermaid
flowchart TB
    subgraph Browser
        UI["React client<br/>(PdfUploader, ChatComponent, RenderQA)"]
        Voice["Web Speech API<br/>(voice mode)"]
    end

    subgraph "Node.js API (port 5001)"
        Server["server.js<br/>POST /upload, GET /chat"]
        RAG["chat.js<br/>RAG pipeline"]
        MCPClient["chat-mcp.js<br/>MCP client"]
        Disk[("server/uploads/")]
    end

    subgraph "Child process (stdio)"
        MCPServer["mcp-server.js<br/>tool: search_web"]
    end

    OpenAI(["OpenAI API"])
    SerpApi(["SerpApi"])

    UI -->|"POST /upload (PDF)"| Server
    Server -->|"save file"| Disk
    UI -->|"GET /chat?question="| Server
    UI <--> Voice
    Server --> RAG
    Server --> MCPClient
    RAG -->|"read PDF"| Disk
    RAG -->|"embeddings, chat"| OpenAI
    MCPClient -->|"JSON-RPC over stdio"| MCPServer
    MCPClient -->|"summarise results"| OpenAI
    MCPServer -->|"HTTPS"| SerpApi
```

## What happens on `GET /chat`

The two answers are produced one after the other, not in parallel, so the response time is the sum of both.

```mermaid
sequenceDiagram
    actor User
    participant Client as React client
    participant API as server.js
    participant RAG as chat.js
    participant MCPC as chat-mcp.js
    participant MCPS as mcp-server.js
    participant OpenAI
    participant SerpApi

    User->>Client: type or say a question
    Client->>API: GET /chat?question=...

    API->>RAG: chat(filePath, question)
    RAG->>RAG: load the PDF and split it into 500-character chunks
    RAG->>OpenAI: embed all chunks
    OpenAI-->>RAG: vectors (kept in an in-memory store)
    RAG->>OpenAI: embed the question
    RAG->>RAG: pick the (up to) 4 most similar chunks
    RAG->>OpenAI: prompt = chunks + question
    OpenAI-->>RAG: document answer
    RAG-->>API: ragAnswer

    API->>MCPC: chatMCP(question)
    opt first question only
        MCPC->>MCPS: spawn "node mcp-server.js" and connect over stdio
    end
    MCPC->>MCPS: callTool search_web { query, num: 5 }
    MCPS->>SerpApi: engine=google, q=question, num=5
    SerpApi-->>MCPS: search results (JSON)
    MCPS-->>MCPC: results as text
    MCPC->>OpenAI: "Summarize the search result" + results
    OpenAI-->>MCPC: web search answer
    MCPC-->>API: mcpAnswer

    API-->>Client: { ragAnswer, mcpAnswer }
    Client-->>User: show both answers
    opt voice mode is on
        Client->>User: read ragAnswer aloud, then listen again
    end
```

## Design notes and limits

These follow from keeping the code close to the original project. They are worth knowing before you change or deploy it.

- **One document at a time.** The API remembers only the path of the last uploaded file, in a variable in the server process. A new upload replaces it for every client, and a restart forgets it.
- **No stored index.** Every question loads, splits and embeds the whole document again, so cost and latency grow with the size of the PDF. Nothing is cached between questions.
- **Search on every question.** The search tool is always called, once per question, and the model only summarises what it returns. The model does not decide whether to search.
- **Sequential answers.** The document answer finishes before the web search starts.
- **The search server is a child process.** It is started on the first question and reused afterwards. If an error is thrown while handling a question, the client is closed and a new child process is started on the next question. The child exits together with the API process.
- **Voice mode lives in the browser.** Speech recognition and speech synthesis use the Web Speech API on the client. The API never sees audio. Only `ragAnswer` is read aloud.
- **No authentication.** CORS is open (`cors()` with no options) and the routes are public.

### Failure behaviour

Measured on the current code with a local stand-in for the OpenAI API:

| Situation | Result |
| --- | --- |
| The web search fails (for example no network) | The search tool returns the error text instead of throwing. The model summarises that text, so the request succeeds with HTTP 200 and `mcpAnswer` contains it. |
| OpenAI rejects the request (for example with a wrong key) | The request throws at once, with no retries. Express 4 does not catch errors from `async` route handlers, so the API process exits within about a second. |
| OpenAI cannot be reached (measured with a refused connection) | The client retries for about 90 seconds, then the request throws and the API process exits as above. |
| The search server cannot be started | The request throws and the API process exits, as above. |
| `/chat` is called before any upload and `server/uploads/sample.pdf` does not exist | The request throws and the API process exits, as above. |
