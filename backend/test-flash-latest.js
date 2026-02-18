import { GoogleGenerativeAI } from "@google/generative-ai";
import './src/config/env.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel() {
  try {
    console.log("Trying gemini-flash-latest...");
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent("Hello");
    console.log("gemini-flash-latest works!");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testModel();
