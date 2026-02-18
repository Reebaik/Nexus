import { GoogleGenerativeAI } from "@google/generative-ai";
import './src/config/env.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // There isn't a direct listModels method on the client instance in some versions, 
    // but let's try to just run a simple prompt on a few candidates.
    
    console.log("Trying gemini-1.5-flash...");
    try {
        const model1 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result1 = await model1.generateContent("Hello");
        console.log("gemini-1.5-flash works!");
    } catch (e) {
        console.log("gemini-1.5-flash failed:", e.message);
    }

    console.log("Trying gemini-1.5-flash-latest...");
    try {
        const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result2 = await model2.generateContent("Hello");
        console.log("gemini-1.5-flash-latest works!");
    } catch (e) {
        console.log("gemini-1.5-flash-latest failed:", e.message);
    }

    console.log("Trying gemini-pro...");
    try {
        const model3 = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result3 = await model3.generateContent("Hello");
        console.log("gemini-pro works!");
    } catch (e) {
        console.log("gemini-pro failed:", e.message);
    }

    console.log("Trying gemini-2.0-flash...");
    try {
        const model4 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result4 = await model4.generateContent("Hello");
        console.log("gemini-2.0-flash works!");
    } catch (e) {
        console.log("gemini-2.0-flash failed:", e.message);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

listModels();
