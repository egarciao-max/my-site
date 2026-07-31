const JSON_HEADERS = { "content-type": "application/json; charset=UTF-8" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/send-telegram") {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!env.BOT_TOKEN || !env.CHAT_ID || !env.TURNSTILE_SECRET_KEY) {
      return json({ error: "Server configuration error" }, 500);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "JSON not valid" }, 400);
    }

    const { name, email, message, cfTurnstileToken } = payload ?? {};
    if (!cfTurnstileToken) {
      return json({ error: "Missing Turnstile Token" }, 400);
    }

    const verification = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: cfTurnstileToken,
          remoteip: request.headers.get("CF-Connecting-IP") || undefined,
        }),
      },
    );

    const captchaResult = await verification.json();
    if (!captchaResult.success) {
      return json(
        {
          error: "Captcha validation failed",
          details: captchaResult["error-codes"] ?? [],
        },
        403,
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
      },
    );

    if (!telegramResponse.ok) {
      return json({ error: "Error in telegrams api" }, 500);
    }

    return json({ success: true });
  },
};
