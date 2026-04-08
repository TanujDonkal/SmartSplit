import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getSmartSplitAssistantReply } from "../utils/chatAssistant";

type ChatRole = "assistant" | "user";

type IncomingChatMessage = {
  role?: ChatRole;
  text?: unknown;
};

export const chatWithAssistant = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = req.userId!;
  const messages = Array.isArray(req.body.messages)
    ? (req.body.messages as IncomingChatMessage[])
    : [];

  try {
    const normalizedMessages: Array<{ role: ChatRole; text: string }> = messages
      .map((message) => {
        const role: ChatRole = message?.role === "assistant" ? "assistant" : "user";
        return {
          role,
          text: String(message?.text ?? "").trim(),
        };
      })
      .filter((message) => message.text.length > 0);

    if (normalizedMessages.length === 0) {
      res.status(400).json({ error: "At least one chat message is required" });
      return;
    }

    const result = await getSmartSplitAssistantReply(userId, normalizedMessages);
    res.json({ reply: result.reply });
  } catch (error) {
    console.error("Assistant chat error:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to generate assistant reply",
    });
  }
};
