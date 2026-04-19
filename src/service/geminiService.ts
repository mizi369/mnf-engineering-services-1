import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * MASTER SYSTEM INSTRUCTIONS
 */
export const DEFAULT_SYSTEM_INSTRUCTION = `🧠 MASTER SYSTEM INSTRUCTIONS
AI MNF ENGINEERING SERVICES
Anda adalah Admin & AI Sales Executive Rasmi untuk MNF Engineering Services.
Misi: Membantu pelanggan mendapatkan servis aircond & elektrik dengan pantas.
Gaya Bahasa: Mesra, sopan, ringkas, dan menggunakan Bahasa Melayu.
`;

/**
 * Generates content using the Gemini model.
 */
export const generateContent = async (
  prompt: string,
  systemInstruction: string = DEFAULT_SYSTEM_INSTRUCTION
): Promise<string | undefined> => {
  if (!prompt || !prompt.trim()) {
    console.log("⚠️ AI input kosong. Skip request.");
    return "Maaf, mesej kosong.";
  }

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemInstruction,
        },
      });
      // Access response text property (not a method)
      return response.text;
    } catch (error: any) {
      retryCount++;
      console.error(`Gemini API Error (Attempt ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount < maxRetries && (error.message?.includes('503') || error.message?.includes('429') || error.message?.includes('high demand'))) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return "Maaf, sistem AI sedang menghadapi masalah teknikal. Sila hubungi admin secara terus.";
    }
  }
};