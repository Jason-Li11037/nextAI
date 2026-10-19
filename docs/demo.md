# Run guide and demo script

How to run nextAI on your own machine, check that it works, and show it in about five minutes.

## Prerequisites

- Node.js 20 or later and npm
- An OpenAI API key (embeddings and chat model)
- A SerpApi API key (web search). SerpApi has a free plan with a monthly search limit; check their current terms before relying on it. Every question uses one search.
- A PDF with selectable text to ask questions about. The pipeline has no OCR step, and scanned PDFs were not tested.
- For the voice mode: Chrome or another Chromium-based browser, a microphone and `localhost` or `https`

Never commit your keys. `server/.env` is git-ignored; only `server/.env.example` is tracked, and it contains placeholders.

## Set up and start

From the repository root:

```bash
npm install
cd server && npm install --legacy-peer-deps && cd ..
cp server/.env.example server/.env
```

Edit `server/.env` and replace the placeholders:

```
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
SERPAPI_KEY=<YOUR_SERPAPI_KEY>
```

Start the client and the API together:

```bash
npm run dev
```

- The client opens at http://localhost:3000.
- The API prints `server is running on port 5001`.

`--legacy-peer-deps` is needed in `server/`. Without it `npm install` stops with an `ERESOLVE` error: the server depends on `zod` 4, while an optional peer dependency of `@langchain/community` (`@browserbasehq/stagehand`) asks for `zod` 3. The flag tells npm to ignore peer dependency conflicts.

## Check that it runs

The upload route does not call any external service, so it is a quick check that works before you add real keys:

```bash
curl -F "file=@/path/to/your.pdf" http://localhost:5001/upload
```

The response is `uploads/<file name>uploaded successfully` (there is no space before `uploaded`) and the file appears in `server/uploads/`.

Do not call `/chat` before you have uploaded a file. Without an upload the server falls back to `server/uploads/sample.pdf`, which is not included, and the API process exits.

## Demo script (about 5 minutes)

1. **Start (30 seconds).** Run `npm run dev` and open http://localhost:3000. The page shows the `Next AI` header, an upload area and a question input at the bottom.
2. **Upload (30 seconds).** Drag a PDF onto the upload area, or click it and choose a file. A message `<file name> file uploaded successfully.` appears. The latest upload is the document used for every following question.
3. **Ask about the document (1 minute).** Type a question the document answers and press `Ask`. A spinner shows while the answer loads. Then the question appears as a blue bubble with two answers below it:
   - `RAG Answer (from document):` is built from the (up to) four chunks of the PDF that are most similar to the question. A very short PDF has fewer than four chunks. The prompt tells the model to say that it does not know when the context does not contain the answer.
   - `MCP Answer (with web search):` is a summary of five Google results fetched for the same question through the search tool.

   Point out that the first question is slower than the next ones, because the search server is started as a child process on first use. Every question also re-reads and re-embeds the whole PDF, so longer documents are slower.
4. **Compare the two answers (1 minute).** Ask a question that the document cannot answer, for example about something recent. Because of the prompt, the first answer is expected to say that the model does not know, while the second one can draw on web results. Then ask something the document does cover and compare how the two answers differ. Model output varies from run to run.
5. **Voice mode (1 minute, Chrome).** Click `Chat Mode: Off` so that it reads `Chat Mode: On`. The text input is replaced by a `Click to record` button. Allow microphone access when the browser asks, click the button and say a question. When the browser ends the recognition, the recognised text is sent as the question, the document answer is read aloud, and the microphone starts listening again. Click `Chat Mode: On` to leave the voice mode.
6. **Wrap up (1 minute).** Open [architecture.md](architecture.md) and walk through the sequence diagram: upload, retrieval, the two answers, and the search server running as a child process behind an MCP client. Mention the limits listed there: one document at a time, no stored index, sequential answers.

Speech recognition and speech synthesis come from the browser, so the voice steps depend on the browser, the operating system and the available voices. They were not tested end to end with a real microphone.

## Troubleshooting

| What you see | Cause and fix |
| --- | --- |
| The API process exits when you ask the first question and the log shows `ENOENT ... uploads/sample.pdf` | No file was uploaded yet. Restart `npm run dev`, upload a PDF, then ask. |
| Your question appears with two empty answer boxes and no error message | The request failed. The usual cause is that the API process has stopped; look at the terminal that runs `npm run dev`. `npm run dev` keeps the client running and does not restart the API. Fix the cause, restart `npm run dev` and upload the file again, because the server forgets the document when it restarts. |
| The API process exits within about a second of a question and the log shows an `invalid_api_key` or other authentication error | OpenAI rejected the key in `server/.env`. Fix the key and restart the API. |
| The API process exits after retrying for a while (about 90 seconds when the connection is refused) and the log shows a connection error | OpenAI could not be reached. Check your network and restart the API. |
| `MCP Answer` starts with `Error performing web search:` | The search step failed, for example because of no network, and the model summarised the error text. The API keeps running. The text after the colon is the reason. |
| The voice button does nothing or no voice is read aloud | Use Chrome or another Chromium-based browser, allow the microphone, and open the page from `localhost` or over `https`. Other browsers were not tested. |
