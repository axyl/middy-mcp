# Middy MCP

A Middy middleware for Model Context Protocol (MCP) server integration with AWS Lambda functions.

## Description

Middy MCP is a middleware that enables seamless integration between AWS Lambda functions and Model Context Protocol servers. It provides a convenient way to handle MCP requests and responses within your Lambda functions using the Middy middleware framework. It supports requests sent to AWS Lambda from API Gateway (both REST API / v1 and HTTP API / v2) using the Proxy integration, as well as requests sent form an ALB.

> Disclaimer: hosting your MCP server this way is only compatible with MCP clients using at least protocol version 2025-03-26.

## Install

```bash
pnpm install middy-mcp
```

## Requirements

- Node.js >= 18.0.0
- Middy >= 6.0.0

## Usage

This middleware can throw HTTP exceptions, so it can be convenient to use it in combination with the `@middy/http-error-handler`.

Hereafter is an exemple of a minimal Lambda function handler file. Deploy this lambda as a proxy integration on a `POST` route of your API Gateway and you're good to go.

```typescript
import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import mcpMiddleware from "middy-mcp";

// Create an MCP server
const server = new McpServer({
  name: "Lambda hosted MCP Server",
  version: "1.0.0",
});

// Add an addition tool
server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }],
}));

export const handler = middy()
  .use(mcpMiddleware({ server }))
  .use(httpErrorHandler());
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to open an issue or to submit a pull request 🚀!
