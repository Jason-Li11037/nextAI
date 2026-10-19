# Deployment notes (optional)

> **Status: not tried.** nextAI has only been run on a local machine. Nothing on this page was deployed to a cloud account. The notes below list what the code needs and what to check, so you can judge the effort before you try. Where a statement was measured locally it says so.

The app has two parts that are deployed separately:

- the **client**: a static bundle created by `npm run build`
- the **API**: a long-running Node.js process, `server/server.js`, that also starts `server/mcp-server.js` as a child process

## Do not expose it publicly as it is

The API has no authentication and no rate limit, and CORS is open to every origin. Each question calls OpenAI (embeddings for the whole document plus two chat requests) and SerpApi (one search). Anyone who can reach the API can spend your quota. Put it behind a login, a private network or an allow-list before you give it a public address.

## Build and run

### API

- Node.js 20 or later.
- Install with `npm ci --legacy-peer-deps` inside `server/`. The flag is required, see the [run guide](demo.md#set-up-and-start).
- Start it with `node server.js` **from the `server/` directory** (`npm start` inside `server/` does the same). Upload paths are relative to the working directory: measured by starting the API from the repository root with `node server/server.js`, where every upload failed with HTTP 500 because `uploads/` did not exist.
- The port is fixed at `5001` in `server.js`. A platform that assigns the port through an environment variable needs a code change, or a platform setting that lets you choose the port.
- `node` must be on the `PATH` of the runtime, because the MCP client starts the search server with `node mcp-server.js`. The child process inherits the environment of the API process, including `SERPAPI_KEY`.
- Error handling: any error thrown inside the `/chat` route stops the whole process (see [architecture.md](architecture.md#failure-behaviour)). Run it under something that restarts it, for example the restart policy of a container platform.

### Client

```bash
npm ci
CI=false npm run build   # output in build/
```

- `CI=false` matters. The build prints three ESLint warnings for `ChatComponent.js`. Locally the build succeeds. Some build services set `CI=true`, and then Create React App treats warnings as errors and the build fails. The alternatives are to set `CI=false` in the build settings or to fix the warnings in the code.
- The API address is hard-coded as `const DOMAIN = "http://localhost:5001"` in `src/components/PdfUploader.js` and `src/components/ChatComponent.js`. A deployed client must call the address of the deployed API, so this constant has to change before the build. A common way is to read it from an environment variable that Create React App inlines at build time, for example `process.env.REACT_APP_API_URL`. That change is not made in this repository yet.
- Voice mode needs a secure context, so serve the client over `https`.

## Configuration and secrets

| Variable | Where | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | API | Required for `/chat`. |
| `SERPAPI_KEY` | API | Required for the web search answer. |

Use the secret or environment variable settings of your platform. The code reads `process.env`, and `server/.env` is optional: the API was started locally with the variables set only in the environment and no `.env` file. Do not put real keys into the repository, the build command or the client bundle. The client needs no secret.

## Storage and scaling

- **Uploaded files** go to `server/uploads/` on the local disk of the API process. On most container platforms that disk is lost when the instance restarts or is replaced.
- **The current document** is a variable in the memory of the API process. A second instance would not know about a file uploaded to the first one, and one upload replaces the document for every user.
- So run **one instance**, and treat the deployment as a single-user demo. A multi-user version needs per-user document storage and a stored vector index, which is a larger change than a deployment setting.

## Hosting examples

These are examples only; any static host plus any host that can run a Node.js process works the same way.

| Part | Example | What to configure (untested) |
| --- | --- | --- |
| Client | AWS Amplify Hosting | Build with `npm ci` and `CI=false npm run build`, publish the `build/` directory, and set the API address as described above. |
| API | AWS App Runner | Install with `cd server && npm ci --legacy-peer-deps`, start with `cd server && node server.js`, set port `5001`, add the two keys as secrets, keep the instance count at one. |

Region, account and service names are specific to your setup and are left out on purpose.

## Non-functional considerations

| Area | State of this project |
| --- | --- |
| Performance | Each question loads, splits and embeds the whole PDF again, then runs the document answer and the web search answer one after the other. Latency grows with the document size and is the sum of both answers. Check proxy and load balancer timeouts against that. |
| Scalability | Not scalable as built: one document in process memory, files on local disk, no shared state. See Storage and scaling. |
| Reliability | Errors inside `/chat` stop the process. A failed web search is reported inside `mcpAnswer` instead. The project code adds no retries or timeouts of its own. |
| Availability | A single instance with no health check route. Availability depends on the platform restarting the process. |
| Maintainability | Small code base, no automated tests, dependency versions follow the original project. The `multer` 1.x line has published security advisories. |
| Security | No authentication, open CORS, no rate limit, no limit on the type or size of uploaded files. Uploaded files are stored under their original names. The text of the document chunks and the questions are sent to OpenAI, and the questions are sent to SerpApi. |
| Usability | Single page with an upload area, a question box and an optional voice mode. When a request fails, the interface shows the question with two empty answer boxes and no message (measured with the API stopped by a rejected key). |
| Accessibility | Not audited. The client uses Ant Design components with their default semantics, and the voice mode depends on browser support. |
| Legal | Check the current terms of OpenAI and of your SerpApi plan for your use case (free plans can be limited to non-commercial use), and make sure you may send the uploaded documents to those services. |
