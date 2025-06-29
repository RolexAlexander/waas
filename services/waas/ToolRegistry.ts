import { Tool } from './tools/Tool';
import { allTools } from './tools/prebuilt';

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();

  private constructor() {
    allTools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public listTools(): Tool[] {
    return Array.from(this.tools.values());
  }
}
