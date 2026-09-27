export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured"
    });
  }

  try {
    const body = req.body || {};
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history)
      ? body.history.slice(-8)
      : [];

    if (!message) {
      return res.status(400).json({
        error: "Missing message"
      });
    }

    const systemInstruction = `
你是“牟之记忆法”的英语学习教练。

用户主要会问：
- 英语单词
- 英语短语
- 英语句型
- 英语用法

请用简洁、自然、适合中国大学生英语学习者的方式回答。

如果用户明显是在询问一个英语单词或词组，请在正常回答后，额外输出：

<WORD>{"word":"...","pronunciation":"...","meaning":"...","example":"...","translation":"..."}</WORD>

要求：

word：
标准英文单词或词组。

pronunciation：
简洁的 IPA 音标。

meaning：
中文核心意思，可以包含 1-2 个常见义项。

example：
自然、实用的英文例句。

translation：
例句的中文翻译。

JSON 中不要加入 Markdown，不要加入额外字段。

如果用户不是在询问英语单词或词组，则不要输出 <WORD>。

回答应该自然、简洁，不要过度解释。
`;

    const contents = [
      ...history
        .filter(
          x =>
            x &&
            (x.role === "user" || x.role === "assistant")
        )
        .map(x => ({
          role: x.role === "assistant" ? "model" : "user",
          parts: [
            {
              text: String(x.content || x.text || "")
            }
          ]
        })),

      {
        role: "user",
        parts: [
          {
            text: message
          }
        ]
      }
    ];

    const model =
      process.env.GEMINI_MODEL || "gemini-3.7-flash";

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: systemInstruction
            }
          ]
        },

        contents,

        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.3
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed"
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part?.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      return res.status(502).json({
        error: "Gemini returned an empty response"
      });
    }

    const match = text.match(
      /<WORD>([\s\S]*?)<\/WORD>/
    );

    let word = null;

    const reply = text
      .replace(/<WORD>[\s\S]*?<\/WORD>/, "")
      .trim();

    if (match) {
      try {
        word = JSON.parse(match[1]);
      } catch (error) {
        word = null;
      }
    }

    return res.status(200).json({
      reply,
      word
    });

  } catch (error) {

    return res.status(500).json({
      error:
        error?.message ||
        "Server error"
    });
  }
}
