import { Prisma } from "@prisma/client";
import prisma from "./prisma";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  role: ChatRole;
  text: string;
};

type AssistantContext = {
  user: {
    id: string;
    name: string;
    email: string;
    defaultCurrency: string;
  };
  friends: Array<{
    id: string;
    name: string;
    email: string;
    netBalance: number;
    recentActivity: string | null;
  }>;
  groups: Array<{
    id: string;
    name: string;
    memberCount: number;
    expenseCount: number;
    yourBalance: number;
  }>;
  recentExpenses: Array<{
    scope: "friend" | "group";
    description: string;
    amount: number;
    currency: string;
    note: string | null;
    createdAt: string;
    counterpart: string;
  }>;
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<
      | {
          type?: string;
          text?: string;
        }
      | {
          type?: string;
          value?: string;
        }
    >;
  }>;
};

function extractResponseText(body: OpenAiResponse) {
  const directOutputText = body.output_text?.trim();

  if (directOutputText) {
    return directOutputText;
  }

  const fallbackText = body.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => {
      if ("text" in content && typeof content.text === "string") {
        return content.text.trim();
      }

      if ("value" in content && typeof content.value === "string") {
        return content.value.trim();
      }

      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();

  return fallbackText || "";
}

function getOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4.1-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return { apiKey, model };
}

function toPair(userId: string, friendId: string) {
  return userId < friendId
    ? { user_a_id: userId, user_b_id: friendId }
    : { user_a_id: friendId, user_b_id: userId };
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function getFriendSummaryNumbers(
  activities: Array<{
    amount: Prisma.Decimal | number;
    converted_amount: Prisma.Decimal | number;
    split_type: "EQUAL" | "FULL_AMOUNT";
    activity_type: "EXPENSE" | "SETTLEMENT";
    payer: { id: string };
  }>,
  userId: string,
) {
  let netBalance = 0;

  for (const activity of activities) {
    const convertedAmount = Number(activity.converted_amount);
    const paidByMe = activity.payer.id === userId;

    if (activity.activity_type === "SETTLEMENT") {
      netBalance += paidByMe ? -convertedAmount : convertedAmount;
      continue;
    }

    const impact = activity.split_type === "FULL_AMOUNT" ? convertedAmount : convertedAmount / 2;
    netBalance += paidByMe ? impact : -impact;
  }

  return roundMoney(netBalance);
}

async function getFriendContexts(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ user_a_id: userId }, { user_b_id: userId }],
    },
    include: {
      userA: { select: { id: true, name: true, email: true } },
      userB: { select: { id: true, name: true, email: true } },
      expenses: {
        include: {
          payer: { select: { id: true } },
        },
        orderBy: [{ incurred_on: "desc" }, { created_at: "desc" }],
      },
    },
    orderBy: { created_at: "desc" },
  });

  return friendships.map((friendship) => {
    const friend = friendship.userA.id === userId ? friendship.userB : friendship.userA;
    const netBalance = getFriendSummaryNumbers(friendship.expenses, userId);

    return {
      id: friend.id,
      name: friend.name,
      email: friend.email,
      netBalance,
      recentActivity: friendship.expenses[0]?.created_at.toISOString() ?? null,
      recentExpenses: friendship.expenses.slice(0, 4).map((expense) => ({
        scope: "friend" as const,
        description: expense.description,
        amount: Number(expense.amount),
        currency: expense.currency,
        note: expense.note,
        createdAt: expense.created_at.toISOString(),
        counterpart: friend.name,
      })),
    };
  });
}

async function getGroupContexts(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { user_id: userId },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          expenses: {
            include: { splits: true },
            orderBy: [{ incurred_on: "desc" }, { created_at: "desc" }],
          },
        },
      },
    },
    orderBy: { group: { created_at: "desc" } },
  });

  return memberships.map((membership) => {
    const balanceMap = new Map<string, number>();

    for (const member of membership.group.members) {
      balanceMap.set(member.user_id, 0);
    }

    for (const expense of membership.group.expenses) {
      balanceMap.set(
        expense.payer_id,
        (balanceMap.get(expense.payer_id) ?? 0) + Number(expense.converted_amount),
      );

      for (const split of expense.splits) {
        balanceMap.set(
          split.user_id,
          (balanceMap.get(split.user_id) ?? 0) - Number(split.converted_amount_owed),
        );
      }
    }

    return {
      id: membership.group.id,
      name: membership.group.name,
      memberCount: membership.group.members.length,
      expenseCount: membership.group.expenses.length,
      yourBalance: roundMoney(balanceMap.get(userId) ?? 0),
      recentExpenses: membership.group.expenses.slice(0, 4).map((expense) => ({
        scope: "group" as const,
        description: expense.description,
        amount: Number(expense.amount),
        currency: expense.currency,
        note: expense.note,
        createdAt: expense.created_at.toISOString(),
        counterpart: membership.group.name,
      })),
    };
  });
}

async function buildAssistantContext(userId: string): Promise<AssistantContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, default_currency: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const [friendContexts, groupContexts] = await Promise.all([
    getFriendContexts(userId),
    getGroupContexts(userId),
  ]);

  const recentExpenses = [...friendContexts.flatMap((friend) => friend.recentExpenses), ...groupContexts.flatMap((group) => group.recentExpenses)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      defaultCurrency: user.default_currency,
    },
    friends: friendContexts.map(({ recentExpenses: _recentExpenses, ...friend }) => friend),
    groups: groupContexts.map(({ recentExpenses: _recentExpenses, ...group }) => group),
    recentExpenses,
  };
}

export async function getSmartSplitAssistantReply(userId: string, messages: ChatMessage[]) {
  const { apiKey, model } = getOpenAiConfig();
  const context = await buildAssistantContext(userId);
  const trimmedMessages = messages
    .filter((message) => message.role === "assistant" || message.role === "user")
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: [
        {
          type: message.role === "assistant" ? "output_text" : "input_text",
          text: message.text,
        },
      ],
    }));

  const systemPrompt = [
    "You are SmartSplit AI, an in-app assistant for an expense-sharing app.",
    "Answer only using the SmartSplit context provided.",
    "Be concise, practical, and user-friendly.",
    "If the answer cannot be confirmed from the context, say that clearly and suggest where in the app the user can check.",
    "Amounts in balances are normalized to CAD unless the original expense currency is explicitly mentioned.",
    "Do not invent friends, groups, expenses, or balances.",
    "Do not give legal, medical, or financial advice beyond app usage help.",
    `SmartSplit context JSON:\n${JSON.stringify(context)}`,
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        ...trimmedMessages,
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI assistant failed (${response.status}): ${body}`);
  }

  const body = (await response.json()) as OpenAiResponse;
  const outputText = extractResponseText(body);

  if (!outputText) {
    throw new Error("AI assistant returned an empty response");
  }

  return {
    reply: outputText,
    context,
  };
}
