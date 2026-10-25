// The OpenAI chat model used for both answers.
export const getChatModel = () => process.env.OPENAI_CHAT_MODEL || "gpt-5";
