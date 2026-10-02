import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
    timeout: 18000,
  },
});

// API route to analyze group buy text, uploaded text files, or screenshots/images
app.post("/api/parse-group-buy", async (req, res) => {
  try {
    const { text, images } = req.body;
    const hasText = text && typeof text === "string" && text.trim().length > 0;
    const hasImages = Array.isArray(images) && images.length > 0;

    if (!hasText && !hasImages) {
      return res.status(400).json({ error: "請提供要分析的團購文字訊息、文字檔或截圖/圖片" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "尚未設定 GEMINI_API_KEY 金鑰" });
    }

    const promptText = `你是一個團購整理專家助手。請仔細分析所提供的團購對話紀錄、留言截圖、LINE 訊息、紙本筆記或文字檔案，精準提取出所有的訂購者與下單商品清單。

規則指示：
1. 提取每一筆下單記錄：包含購買人 (buyer)、品項名稱 (item)、單價 (price) 和數量 (quantity)。
2. 數量與語意解析：例如 "+1"、"加一" 或 "1盒" 填 1；"+2" 填 2。如果截圖或對話中只有寫 "+1"，且有提到品項名稱，請自動匹配該品項。
3. 如果未明確提及單價，請試圖從全文或圖片內容（菜單價格、價目表）中尋找商品價錢，找不到請設為 0。
4. 若同一人購買多個不同品項，請拆分成多筆記錄。
5. 購買人若無法識別，請填寫 "未具名" 或根據對話暱稱、頭銜。

${hasText ? `待分析文字內容如下：\n---\n${text}\n---` : "請從上傳的圖片中進行視覺與文字 OCR 辨識，整理團購訂單。"}
`;

    const contentsParts: any[] = [];

    // Add image parts if provided
    if (hasImages) {
      for (const imgDataUrl of images) {
        if (typeof imgDataUrl === "string") {
          const match = imgDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            contentsParts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        }
      }
    }

    // Add text prompt part
    contentsParts.push({ text: promptText });

    const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash"];
    let response;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: contentsParts,
          config: {
            systemInstruction: "你是一個專業的團購對話、文字與圖片視覺分析工具，請準確提取購買者、品項、單價與數量，並輸出 JSON 格式。若品項未標示固定價格（例如店家現場秤重、未定價、按秤重標價或未提及單價），請將單價 price 設為 0。",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "提取出來的訂單列表",
              items: {
                type: Type.OBJECT,
                properties: {
                  buyer: { type: Type.STRING, description: "購買人姓名或暱稱" },
                  item: { type: Type.STRING, description: "品項名稱" },
                  price: { type: Type.NUMBER, description: "單價" },
                  quantity: { type: Type.INTEGER, description: "數量" },
                },
                required: ["buyer", "item", "price", "quantity"],
              },
            },
          },
        });
        if (response?.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini model ${modelName} failed:`, err?.message || err);
        // Immediately try next candidate model
        continue;
      }
    }

    if (!response?.text) {
      throw lastError || new Error("無法從 AI 取得有效回應");
    }

    let jsonText = response.text.trim();
    // Remove markdown code fences if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedData = [];
    try {
      parsedData = JSON.parse(jsonText);
    } catch (parseErr) {
      console.warn("Direct JSON parse failed, trying regex extraction:", parseErr);
      const match = jsonText.match(/\[[\s\S]*\]/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        throw new Error("無法解析 AI 回傳的訂單格式");
      }
    }

    return res.json({ success: true, items: parsedData });
  } catch (error: any) {
    console.error("AI Parse Error:", error);
    const msg = error?.message || "";
    if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
      return res.status(503).json({ error: "AI 服務目前使用量高，請等待 3~5 秒後重試！" });
    }
    return res.status(500).json({ error: error?.message || "AI 分析失敗，請檢查輸入內容或圖片再試。" });
  }
});

// Custom error handler to guarantee JSON responses for all /api errors and body parsing errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Middleware Error:", err);
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({ error: "上傳的圖片或資料總量過大，請減少圖片張數後重試" });
  }
  if (res.headersSent) {
    return next(err);
  }
  return res.status(err.status || 500).json({ error: err.message || "伺服器處理錯誤" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
