import Anthropic from "@anthropic-ai/sdk";

/**
 * Vercel serverless function: reads a receipt photo with Claude vision and
 * returns structured expense fields. The API key lives here, never in the
 * browser. Configure ANTHROPIC_API_KEY in Vercel project settings.
 *
 * Request:  POST { image: <base64>, mediaType: "image/jpeg" }
 * Response: { vendor, amountMajor, dateISO, category, confidence }
 */

// Keep in sync with EXPENSE_CATEGORIES in src/domain/presets.ts
const CATEGORIES = [
  "Stock / supplies",
  "Rent",
  "Power / fuel",
  "Transport",
  "Salaries",
  "Equipment",
  "Data / airtime",
  "Other",
];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["vendor", "amountMajor", "dateISO", "category", "confidence"],
  properties: {
    vendor: {
      type: "string",
      description: "Business the money was paid to, as printed. Empty string if unreadable.",
    },
    amountMajor: {
      type: "number",
      description: "The grand total actually paid, in major currency units (e.g. 1250.50). 0 if unreadable.",
    },
    dateISO: {
      type: "string",
      description: "Receipt date as YYYY-MM-DD, or empty string if not visible.",
    },
    category: { type: "string", enum: CATEGORIES },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
} as const;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(501).json({ error: "not_configured" });
  }

  const { image, mediaType } = req.body ?? {};
  if (typeof image !== "string" || image.length === 0) {
    return res.status(400).json({ error: "missing_image" });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: process.env.EXTRACT_MODEL || "claude-opus-5",
      max_tokens: 2048,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SCHEMA as any },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text:
                "This is a photo of a purchase receipt or invoice a small business owner is " +
                "recording as an expense. Extract the vendor, the grand total paid, the receipt " +
                "date, and the best-fitting expense category. If the photo is not a receipt or " +
                "is unreadable, use empty strings / 0 and confidence \"low\".",
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "unreadable" });
    }

    const text = response.content.find((b: any) => b.type === "text")?.text;
    if (!text) {
      return res.status(422).json({ error: "no_output" });
    }
    return res.status(200).json(JSON.parse(text));
  } catch (err: any) {
    console.error("[extract-receipt]", err?.status, err?.message);
    const status = err?.status === 429 ? 429 : 502;
    return res.status(status).json({ error: "extraction_failed" });
  }
}
