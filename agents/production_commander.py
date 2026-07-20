import asyncio
import os
import sys

from google.antigravity import Agent, LocalAgentConfig, types

# Setup path to MCP Server
MCP_SERVER_DIR = os.path.join(os.path.dirname(__file__), "..", "apps", "mcp-server")
MCP_SERVER_SCRIPT = os.path.join(MCP_SERVER_DIR, "dist", "index.js")

mcp_servers = [
    types.McpStdioServer(
        command="node",
        args=[MCP_SERVER_SCRIPT],
    )
]

config = LocalAgentConfig(
    mcp_servers=mcp_servers,
    system_instruction=(
        "Jesteś Dowódcą Operacyjnym (Production Commander) w systemie MAX SPEED ERP. "
        "Twoim zadaniem jest nadzorowanie produkcji maszyn ETO (Engineer-to-Order), "
        "identyfikowanie wąskich gardeł, weryfikowanie zasobów kadrowych (HR) i dbanie o zgodność z normami (RAG). "
        "Masz dostęp do narzędzi analitycznych poprzez serwer MCP. "
        "Odpowiadaj krótko, jak w wojskowym meldunku operacyjnym. "
        "Gdy użyjesz narzędzi, zawsze na koniec podsumuj rekomendację działania."
    ),
    # You could set policy.allow("approve_temporal_workflow") here if needed
)

async def main():
    print("--- Uruchamianie Agenta Dowódcy (Production Commander) ---")
    
    # Prompt od użytkownika (Command Center)
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Czy mamy wąskie gardła w projekcie Ruukki?"
    print(f"[ZAPYTANIE]: {prompt}\n")

    async with Agent(config) as agent:
        print("[AGENT PRZETWARZA...]")
        # Send the prompt to the agent and await the full response.
        # The agent will automatically call MCP tools during its execution if it needs to.
        response = await agent.chat(prompt)
        
        # Oczekujemy, że Agent zdecyduje się odpytać narzędzia RAG, PM i HR w tle.
        print("\n--- MELDUNEK ZWROTNY ---")
        print(await response.text())

if __name__ == "__main__":
    if "GEMINI_API_KEY" not in os.environ:
        print("ERROR: GEMINI_API_KEY is missing! Zdobądź klucz na https://aistudio.google.com/app/api-keys")
        sys.exit(1)
        
    asyncio.run(main())
