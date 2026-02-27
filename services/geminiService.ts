import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const optimizeContent = async (title: string, category: string, benefits: string[] = []) => {
  try {
    const benefitsText = benefits.length > 0
      ? ` and benefits: ${benefits.join(', ')}`
      : '';
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a versatile, catchy, SHORT description (1-2 sentences max, under 120 characters ideal) for a mantra/wellness content titled "${title}" in category "${category}"${benefitsText}. Make it evocative and engaging, suitable for a meditation app.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "Short catchy description" }
          },
          required: ["description"]
        }
      }
    });

    const parsed = JSON.parse(response.text);
    return { description: parsed.description };
  } catch (error) {
    console.error("Gemini optimization failed:", error);
    return null;
  }
};

export const generateEngagementSummary = async (stats: any) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze these content engagement stats and provide a 2-sentence executive summary with a growth recommendation: ${JSON.stringify(stats)}`,
      config: {
        systemInstruction: "You are a professional business analyst specializing in wellness apps."
      }
    });
    return response.text;
  } catch (error) {
    return "Analytics summary unavailable at the moment.";
  }
};
