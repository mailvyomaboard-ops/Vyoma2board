import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, "..");

const server = new Server(
  {
    name: "moodboard-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_workspace_files",
        description: "Recursively lists files in the local workspace",
        inputSchema: {
          type: "object",
          properties: {
            directory: {
              type: "string",
              description: "Optional subdirectory to list (relative to workspace root)",
            },
          },
        },
      },
      {
        name: "read_local_file",
        description: "Reads the content of a specific file in the workspace",
        inputSchema: {
          type: "object",
          properties: {
            filepath: {
              type: "string",
              description: "Path to the file relative to the workspace root",
            },
          },
          required: ["filepath"],
        },
      },
      {
        name: "sync_to_compiler",
        description: "Stub for syncing local code to an external online compiler via HTTP",
        inputSchema: {
          type: "object",
          properties: {
            compiler_url: {
              type: "string",
              description: "The API endpoint of the online compiler",
            },
          },
          required: ["compiler_url"],
        },
      },
    ],
  };
});

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_workspace_files": {
      const subDir = request.params.arguments?.directory || "";
      const targetDir = path.join(WORKSPACE_DIR, subDir);
      
      try {
        const allFiles = await listFiles(targetDir);
        const relativeFiles = allFiles.map((f) => path.relative(WORKSPACE_DIR, f));
        return {
          content: [{ type: "text", text: JSON.stringify(relativeFiles, null, 2) }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error reading directory: ${err.message}` }],
        };
      }
    }

    case "read_local_file": {
      const filepath = request.params.arguments?.filepath;
      if (!filepath) {
        throw new Error("filepath is required");
      }
      
      const absolutePath = path.join(WORKSPACE_DIR, filepath);
      try {
        const content = await fs.readFile(absolutePath, "utf-8");
        return {
          content: [{ type: "text", text: content }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error reading file: ${err.message}` }],
        };
      }
    }

    case "sync_to_compiler": {
      const compilerUrl = request.params.arguments?.compiler_url;
      // In a real implementation, you would zip the files or POST them individually.
      // For now, we simulate the action.
      return {
        content: [
          {
            type: "text",
            text: `Successfully 'synced' local files to ${compilerUrl}. (This is a stub, actual HTTP request not made).`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Moodboard MCP Server running on stdio");
}

run().catch(console.error);
