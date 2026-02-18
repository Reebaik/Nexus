import { GoogleGenerativeAI } from "@google/generative-ai";
import './src/config/env.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    console.log("Testing specific 1.5 variants...");

    const variants = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-8b",
        "gemini-flash-latest" 
    ];

    for (const modelName of variants) {
        console.log(`Trying ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello");
            console.log(`${modelName} WORKS!`);
        } catch (e) {
            console.log(`${modelName} failed:`, e.message.split('\n')[0]);
        }
    }

  } catch (err) {
    console.error("Error:", err);
  }
}

listModels();
