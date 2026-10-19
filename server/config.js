// Read at call time: server.js loads server/.env only after its imports have run.
export const getChatModel = () => process.env.OPENAI_CHAT_MODEL || "gpt-5";
