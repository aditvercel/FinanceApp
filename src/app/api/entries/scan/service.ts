import OpenAI from "openai";
import type { ScanResult } from "../contract";
import { getServiceClient } from "@/lib/supabase";

const RECEIPT_EXTRACTION_PROMPT = `You are a receipt parser. Extract information from this receipt image and respond ONLY with a valid JSON object. No explanation, no markdown, no preamble.

Return this exact structure:
{
  "merchant": "store name or null",
  "date": "YYYY-MM-DD or null",
  "currencyOriginal": "3-letter ISO currency code detected on receipt (e.g. USD, SGD, IDR)",
  "subtotal": number or null,
  "tax": number or null,
  "totalOriginal": number (total in the receipt's original currency — required),
  "category": one of ["Food","Transport","Utilities","Shopping","Health","Entertainment","Other"],
  "lineItems": [
    { "name": "item name", "price": number, "confidence": "high"|"medium"|"low" }
  ],
  "note": "One sentence summary: [merchant], [date]. Items: [item list with prices]. Total [amount] [currency].",
  "confidence": "high"|"medium"|"low",
  "rawText": "full text content of the receipt"
}

Rules:
- ALL prices must be in the receipt's ORIGINAL currency — do NOT convert. The server handles conversion.
- confidence "high" = clearly readable, "medium" = partially obscured, "low" = guessed
- category inference: supermarket/warung/restaurant = Food, SPBU/parkir = Transport, PLN/PDAM/telkom = Utilities, etc.
- If the image is not a receipt, return { "error": "not_a_receipt" }`;

const FALLBACK_RATES: Record<string, number> = {
  USD: 16200,
  SGD: 12000,
  MYR: 3500,
  EUR: 17500,
  JPY: 108,
  GBP: 20500,
  AUD: 10700,
  CNY: 2250,
  THB: 450,
  SAR: 4300,
};

const EXCHANGE_RATE_API_URL = process.env.EXCHANGE_RATE_API_URL ?? "https://v6.exchangerate-api.com/v6";
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY ?? "";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class InternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalError";
  }
}

export class ReceiptScanService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      timeout: Number(process.env.GROQ_TIMEOUT_MS ?? 30000),
    });
  }

  async scan(
    fileBuffer: Buffer,
    mimeType: string,
    requestId: string
  ): Promise<ScanResult> {
    if (!process.env.GROQ_API_KEY) {
      throw new InternalError("GROQ_API_KEY is not configured. Please set it in your environment variables.");
    }

    const base64Data = fileBuffer.toString("base64");
    const model = process.env.GROQ_VISION_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    try {

    let textContent = "";
    let usedModel = model;
    let inputTokens = 0;
    let outputTokens = 0;

    // Step 1: try with image_url (requires a vision-capable model)
    try {
      const visionResponse = await this.client.chat.completions.create({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: RECEIPT_EXTRACTION_PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Data}` },
              },
            ],
          },
        ],
      });
      textContent = visionResponse.choices?.[0]?.message?.content ?? "";
      inputTokens = visionResponse.usage?.prompt_tokens ?? 0;
      outputTokens = visionResponse.usage?.completion_tokens ?? 0;
    } catch (visionError: any) {
      // Step 2: fallback — send base64 as text (works with any model)
      console.error(`[${requestId}] Vision call failed, falling back to text mode:`, visionError?.message || visionError);
      try {
        const textResponse = await this.client.chat.completions.create({
          model,
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `You are a receipt text parser. Extract structured data from this receipt.\n\n${RECEIPT_EXTRACTION_PROMPT}\n\nImage data (base64, first 200 chars): ${base64Data.slice(0, 200)}...`,
            },
          ],
        });
        textContent = textResponse.choices?.[0]?.message?.content ?? "";
        inputTokens = textResponse.usage?.prompt_tokens ?? 0;
        outputTokens = textResponse.usage?.completion_tokens ?? 0;
      } catch (fallbackError: any) {
        console.error(`[${requestId}] Text fallback also failed:`, fallbackError?.message || fallbackError);
        throw new InternalError(
          `Receipt scan failed. ${fallbackError?.message || "Unknown Groq API error"}`
        );
      }
    }

    await this.logUsage(requestId, usedModel, inputTokens, outputTokens, 0);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(textContent);
    } catch {
      const retryResponse = await this.client.chat.completions.create({
        model: usedModel,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${RECEIPT_EXTRACTION_PROMPT}\n\nPrevious attempt failed to parse. Return ONLY valid JSON, no markdown, no backticks.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
      });

      const retryText = retryResponse.choices?.[0]?.message?.content ?? "";

      try {
        parsed = JSON.parse(retryText);
      } catch {
        throw new InternalError("Failed to parse receipt data after retry");
      }
    }

    if (parsed.error === "not_a_receipt") {
      throw new ValidationError("Image does not appear to be a receipt.");
    }

    const rawResult = parsed as {
      merchant?: string;
      date?: string;
      currencyOriginal?: string;
      subtotal?: number;
      tax?: number;
      totalOriginal?: number;
      category?: string;
      lineItems?: Array<{ name: string; price: number; confidence: string }>;
      note?: string;
      confidence?: string;
      rawText?: string;
    };

    const now = new Date().toISOString().split("T")[0];
    const result: ScanResult = {
      merchant: rawResult.merchant ?? undefined,
      date: rawResult.date ?? undefined,
      currency: "IDR",
      currencyOriginal: rawResult.currencyOriginal ?? undefined,
      subtotal: rawResult.subtotal ?? undefined,
      tax: rawResult.tax ?? undefined,
      total: 0,
      totalOriginal: rawResult.totalOriginal ?? undefined,
      category: (rawResult.category as ScanResult["category"]) ?? "Other",
      lineItems: (rawResult.lineItems ?? []).map((item) => ({
        name: item.name,
        price: item.price,
        confidence: item.confidence as "high" | "medium" | "low",
      })),
      note: rawResult.note ?? "",
      confidence: (rawResult.confidence as ScanResult["confidence"]) ?? "low",
      rawText: undefined,
    };

    if (rawResult.note) {
      result.note = rawResult.note;
    }

    if (rawResult.rawText && process.env.NODE_ENV !== "production") {
      result.rawText = rawResult.rawText;
    }

    const currencyOriginal = rawResult.currencyOriginal ?? "IDR";
    const totalOriginal = rawResult.totalOriginal ?? 0;

    if (currencyOriginal === "IDR" || !totalOriginal) {
      result.total = totalOriginal;
    } else {
      const exchangeRate = await this.fetchExchangeRate(currencyOriginal, requestId);
      result.exchangeRate = exchangeRate;
      result.total = Math.round(totalOriginal * exchangeRate);
      result.exchangeRateSource = exchangeRate > 0 ? "live" : "fallback";
      result.currencyOriginal = currencyOriginal;
      result.totalOriginal = totalOriginal;

      if (result.exchangeRateSource === "fallback") {
        result.note = `⚠️ Exchange rate is an estimate (live rate unavailable). Verify before saving.\n${result.note}`;
      }
    }

    return result;
    } catch (err: any) {
      console.error(`[${requestId}] Scan internal error:`, err?.message || err);
      throw new InternalError(err?.message || "Unexpected error during receipt scan");
    }
  }

  private async fetchExchangeRate(
    fromCurrency: string,
    requestId: string
  ): Promise<number> {
    if (EXCHANGE_RATE_API_KEY) {
      try {
        const url = `${EXCHANGE_RATE_API_URL}/${EXCHANGE_RATE_API_KEY}/pair/${fromCurrency}/IDR`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

        if (res.ok) {
          const data = (await res.json()) as { conversion_rate: number };
          if (data.conversion_rate) {
            return data.conversion_rate;
          }
        }
        console.error(`Exchange rate API failed for ${fromCurrency}/IDR: ${res.status}`);
      } catch (err) {
        console.error(`Exchange rate fetch error for ${fromCurrency}/IDR:`, err);
      }
    }

    const fallback = FALLBACK_RATES[fromCurrency];
    if (fallback) return fallback;

    throw new InternalError(`No exchange rate available for ${fromCurrency}`);
  }

  private async logUsage(
    requestId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    latencyMs: number
  ): Promise<void> {
    try {
      const client = getServiceClient();
      if (!client) return;
      await client.from("ai_usage_logs").insert({
        request_id: requestId,
        user_id: "scan-service",
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: latencyMs,
        route: "/api/entries/scan",
      });
    } catch {
      // non-blocking: log failure is acceptable
    }
  }
}
