#!/usr/bin/env node
/**
 * mn-amm-mcp — stdio MCP server over the agent-safe AMM tool surface.
 * Tool definitions, policy/audit wiring: ./server.ts. Run:
 *
 *   npx mn-amm-mcp              # (or: node mcp-server/src/main.ts)
 *
 * Configuration is the same env family as the CLI/API: AMM_NETWORK_ID
 * (undeployed|preprod), AMM_CONTRACT / pool registry, AMM_SERVE_URL,
 * AMM_WALLET, AMM_POLICY_FILE, AMM_MCP_AUDIT_FILE. Intended agent role:
 * AMM_SERVE_URL=ws://127.0.0.1:9934 AMM_WALLET=mn-amm-agent.
 * @module
 */

import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createMcpServer } from './server.ts';

async function main(): Promise<void> {
  const { server } = createMcpServer({});
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the MCP channel — only log to stderr.
  console.error('mn-amm-mcp: stdio transport ready (agent-safe AMM tools, dry-run by default)');
}

main().catch((cause) => {
  console.error(`mn-amm-mcp: fatal: ${cause instanceof Error ? (cause.stack ?? cause.message) : String(cause)}`);
  process.exit(1);
});
