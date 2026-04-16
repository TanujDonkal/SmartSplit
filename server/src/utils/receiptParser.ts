import { normalizeCurrency } from "./currency";

type ParsedReceipt = {
  description: string;
  amount: number | null;
  currency: string;
  incurred_on: string | null;
  note: string | null;
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
  const model = process.env.OPENAI_RECEIPT_MODEL?.trim() || "gpt-4.1-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return { apiKey, model };
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI receipt parsing did not return valid JSON");
  }

  return text.slice(start, end + 1);
}

function normalizeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export async function parseReceiptImage(receiptUrl: string): Promise<ParsedReceipt> {
  const { apiKey, model } = getOpenAiConfig();

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
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Extract receipt data for an expense app. Return JSON only with: description (string), amount (number or null), currency (3-letter currency code), incurred_on (ISO date string or null), note (string or null). Use the merchant or most helpful short title as description. The amount should be the final total paid on the receipt, including tax or tip when shown. Put the purchased items or a short item summary into note. If the currency is unclear, use CAD. If the date is unclear, return null.",
            },
            {
              type: "input_image",
              image_url: receiptUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "receipt_parse",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              description: { type: "string" },
              amount: { type: ["number", "null"] },
              currency: { type: "string" },
              incurred_on: { type: ["string", "null"], format: "date-time" },
              note: { type: ["string", "null"] },
            },
            required: ["description", "amount", "currency", "incurred_on", "note"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI receipt parsing failed (${response.status}): ${body}`);
  }

  const body = (await response.json()) as OpenAiResponse;
  const outputText = extractResponseText(body);

  if (!outputText) {
    throw new Error("AI receipt parsing returned an empty response");
  }

  const parsed = JSON.parse(extractJson(outputText)) as ParsedReceipt;

  return {
    description: String(parsed.description ?? "").trim(),
    amount:
      typeof parsed.amount === "number" && Number.isFinite(parsed.amount)
        ? Number(parsed.amount.toFixed(2))
        : null,
    currency: normalizeCurrency(parsed.currency || "CAD"),
    incurred_on: normalizeDate(parsed.incurred_on),
    note: parsed.note?.trim() || null,
  };
}
