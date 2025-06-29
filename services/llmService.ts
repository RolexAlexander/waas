
import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, FunctionCall, GenerateImagesResponse, ToolConfig, FunctionCallingConfigMode } from "@google/genai";
import { LlmResponse } from "../types";

const CALLS_PER_MINUTE_LIMIT = 8;
const MINUTE_IN_MS = 60000;

export class LLMService {
  private ai: GoogleGenAI;
  private callCount = 0;
  private maxCalls: number;
  private callTimestamps: number[] = [];
  private apiKey: string;
  private successfulCalls = 0;
  private failedCalls = 0;
  private setThinkingAgent: (name: string | null) => void;

  constructor(apiKey: string, maxCallsPerRun: number = 50, setThinkingAgent: (name: string | null) => void = () => {}) {
    if (!apiKey && process.env.API_KEY) {
        apiKey = process.env.API_KEY;
    }
    
    this.apiKey = apiKey;
    if (!this.apiKey) {
      console.error("LLMService: API key is missing. Please ensure it's set in your environment variables.");
    }
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    this.maxCalls = maxCallsPerRun;
    this.setThinkingAgent = setThinkingAgent;
  }

  public resetCounters() {
    this.callCount = 0;
    this.callTimestamps = [];
    this.successfulCalls = 0;
    this.failedCalls = 0;
  }

  public getMetrics() {
    return {
        successfulCalls: this.successfulCalls,
        failedCalls: this.failedCalls,
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    // Filter out timestamps older than a minute
    this.callTimestamps = this.callTimestamps.filter(
      (timestamp) => now - timestamp < MINUTE_IN_MS
    );

    if (this.callTimestamps.length >= CALLS_PER_MINUTE_LIMIT) {
      const oldestCall = this.callTimestamps[0];
      const timeToWait = MINUTE_IN_MS - (now - oldestCall) + 100; // +100ms buffer
      console.warn(`[LLMService] Rate limit reached. Waiting for ${timeToWait}ms...`);
      await new Promise(resolve => setTimeout(resolve, timeToWait));
      // Recursively check again in case multiple calls are waiting
      return this.waitForRateLimit();
    }
  }

  private async makeApiCall<T>(agentName: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.callCount >= this.maxCalls) {
      throw new Error(`[LLMService] Maximum call limit of ${this.maxCalls} reached for this simulation.`);
    }

    if (!this.apiKey) {
        throw new Error("API key is missing or invalid. Please provide a valid Gemini API key.");
    }

    await this.waitForRateLimit();

    this.callCount++;
    this.callTimestamps.push(Date.now());
    this.setThinkingAgent(agentName);
    console.log(`[LLMService] Making API call for ${agentName}. Total: ${this.callCount}/${this.maxCalls}.`);
    
    try {
        const result = await requestFn();
        this.successfulCalls++;
        return result;
    } catch(e: any) {
        this.failedCalls++;
        console.error(`[LLMService] API call for ${agentName} failed:`, e);
        throw new Error(`API call failed: ${e.message}`);
    } finally {
        this.setThinkingAgent(null);
    }
  }
  
  public async generateResponse(prompt: string, agentName: string, tools?: FunctionDeclaration[], forceToolCall?: boolean): Promise<LlmResponse> {
    const toolConfig: ToolConfig | undefined = forceToolCall ? { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } } : undefined;
    
    const response = await this.makeApiCall<GenerateContentResponse>(agentName, () =>
        this.ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
            config: {
                tools: tools && tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
                toolConfig: toolConfig,
            },
        })
    );
    console.log("Response: ", response);
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
        // For now, we only handle the first function call.
        // Parallel function calling could be a future enhancement.
        return { functionCall: functionCalls[0] };
    }

    return { text: response.text };
  }

  public async generateImages(prompt: string, agentName: string, numImages: number = 1): Promise<string[]> {
    const response = await this.makeApiCall<GenerateImagesResponse>(agentName, () =>
      this.ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
        config: { numberOfImages: numImages, outputMimeType: 'image/png' },
      })
    );
    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages.map(
        (img: any) => `data:image/png;base64,${img.image.imageBytes}`
      );
    }
    return [];
  }
}