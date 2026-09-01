import { Hono } from "hono";
import { fromHono, OpenAPIRoute, contentJson } from "chanfana";
import { z } from "zod";

export class ChatEndpoint extends OpenAPIRoute {
  schema = {
    tags: ["Bot"],
    summary: "Chat with the AI",
    request: {
      body: contentJson(
        z.object({
          messages: z.array(
            z.object({
              role: z.enum(["system", "user", "assistant"]),
              content: z.string(),
            })
          ),
        })
      ),
    },
    responses: {
      "200": {
        description: "Successful response",
        ...contentJson(
          z.object({
            response: z.string(),
          })
        ),
      },
    },
  };

  async handle(c) {
    const data = await this.getValidatedData();

    const providerResponse = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${c.env.AI_KEY_HACKCLUB}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite",
        messages: data.body.messages,
      }),
    });

    if (!providerResponse.ok) {
      const errorText = await providerResponse.text();
      return c.json({ error: `External Provider Error: ${errorText}` }, 500);
    }

    const result = await providerResponse.json();
    const botReply = result.choices?.[0]?.message?.content || "";

    return {
      response: botReply,
    };
  }
}

const app = new Hono();

app.post("/api/send-telegram", async (c) => {
  const env = c.env;

  if (!env.BOT_TOKEN || !env.CHAT_ID || !env.TURNSTILE_SECRET_KEY) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  let payload;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "JSON not valid" }, 400);
  }

  const { name, email, message, cfTurnstileToken } = payload ?? {};
  if (!cfTurnstileToken) {
    return c.json({ error: "Missing Turnstile Token" }, 400);
  }

  const verification = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: cfTurnstileToken,
        remoteip: c.req.header("CF-Connecting-IP") || undefined,
      }),
    }
  );

  const captchaResult = await verification.json();
  if (!captchaResult.success) {
    return c.json(
      {
        error: "Captcha validation failed",
        details: captchaResult["error-codes"] ?? [],
      },
      403
    );
  }

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.CHAT_ID,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      }),
    }
  );

  if (!telegramResponse.ok) {
    return c.json({ error: "Error in telegrams api" }, 500);
  }

  return c.json({ success: true });
});

const openapi = fromHono(app, {
  docs_url: "/docs",
  openapi_url: "/openapi.json",
});

openapi.post("/chat", ChatEndpoint);

export default app;