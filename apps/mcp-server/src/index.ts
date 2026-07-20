import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

// Create an MCP server instance
const server = new McpServer({
  name: "erp-mcp-server",
  version: "1.0.0"
});

// Configure base URL for API Gateway
const API_URL = process.env.API_GATEWAY_URL || "http://127.0.0.1:4005";

// Tool 1: search_rag_context
server.tool(
  "search_rag_context",
  "Wyszukuje kontekst operacyjny (Normy, Zasady, Baza Wiedzy) w systemie RAG (Vector Controller)",
  {
    query: z.string().describe("Zapytanie do bazy wektorowej (np. normy ISO dla spawaczy)")
  },
  async ({ query }) => {
    try {
      const res = await axios.post(`${API_URL}/api/ai/vector/query`, { prompt: query });
      return {
        content: [{ type: "text", text: JSON.stringify(res.data.results, null, 2) }]
      };
    } catch (e: any) {
      return {
        content: [{ type: "text", text: `Błąd wyszukiwania: ${e.message}` }],
        isError: true
      };
    }
  }
);

// Tool 2: query_pm_status
server.tool(
  "query_pm_status",
  "Sprawdza status zadań produkcyjnych w module Project Management (WBS)",
  {
    projectId: z.string().describe("ID Projektu (np. 2d21d569)")
  },
  async ({ projectId }) => {
    // Symulacja lub odpytanie bazy. Moduł PM ma np. /api/pm/projects/:id/tasks
    // Ze względu na uproszczenie w demie, zwracamy mocka powiązanego z bazą wiedzy:
    const mockTasks = [
      { id: "WO-99", status: "PENDING", bottleneck: "Brak personelu (Nocna zmiana)", requiredSkills: ["WELDING_TIG"] }
    ];
    return {
      content: [{ type: "text", text: JSON.stringify(mockTasks, null, 2) }]
    };
  }
);

// Tool 3: check_hr_availability
server.tool(
  "check_hr_availability",
  "Weryfikuje dostępność pracowników i ich uprawnień certyfikacyjnych w systemie HR",
  {
    requiredSkill: z.string().describe("Wymagane uprawnienie, np. WELDING_TIG"),
    date: z.string().describe("Data do weryfikacji (np. jutro)")
  },
  async ({ requiredSkill, date }) => {
    // Symulacja sprawdzenia dostępności w module HR (z uwzględnieniem ważności uprawnień z Prisma)
    const available = [
      { id: "EMP-001", name: "Jan Kowalski", skill: "WELDING_TIG", validUntil: "2027-01-01", status: "Dostępny" },
      { id: "EMP-005", name: "Marek Nowak", skill: "WELDING_TIG", validUntil: "2025-10-10", status: "Niedostępny (Urlop)" }
    ];
    return {
      content: [{ type: "text", text: JSON.stringify(available, null, 2) }]
    };
  }
);

// Tool 4 (Action): approve_temporal_workflow (Option B representation)
server.tool(
  "approve_temporal_workflow",
  "Zatwierdza zawieszony proces workflow (np. ominięcie braku kadr poprzez akceptację nadgodzin)",
  {
    workflowId: z.string().describe("ID zawieszonego Workflow"),
    justification: z.string().describe("Uzasadnienie biznesowe lub wynik analizy Agenta")
  },
  async ({ workflowId, justification }) => {
    return {
      content: [{ type: "text", text: `[SUKCES] Workflow ${workflowId} zatwierdzony. Uzasadnienie: ${justification}. Sygnał wysłany do Temporal.io.` }]
    };
  }
);

// Connect via Stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ERP MCP Server running on stdio");
}

main().catch(e => {
  console.error("Fatal error in MCP Server:", e);
  process.exit(1);
});
