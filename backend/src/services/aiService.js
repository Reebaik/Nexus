import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateExecutiveBrief(metrics) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Using gemini-flash-latest as gemini-1.5-flash was returning 404
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
You are an enterprise project management AI.

Analyze the following project metrics and generate an Executive Project Brief.

Return strictly valid JSON with:

{
  "overallHealth": "Good | At Risk | Critical",
  "summary": "",
  "milestoneAnalysis": "",
  "velocityAnalysis": "",
  "keyRisks": [],
  "recommendations": []
}

Project Metrics:
${JSON.stringify(metrics, null, 2)}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (err) {
    console.error("AI response parsing failed:", text);
    throw new Error("AI response parsing failed");
  }
}
