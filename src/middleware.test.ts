import middy from "@middy/core";
import { describe, expect, test } from "vitest";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import {
  NotAcceptable,
  UnsupportedMediaType,
  UnprocessableEntity,
} from "http-errors";

import mcpMiddleware from "./index.js";

const server = new McpServer({
  name: "test",
  version: "7.7.7",
});
const defaultContext = {} as unknown as Context & {
  jsonRPCMessages: JSONRPCMessage[];
};
const handler = middy().use(mcpMiddleware({ server }));

describe("mcp middleware happy path", () => {
  test("should acknowledge ping message", async () => {
    const event = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "ping", id: 123 }),
      isBase64Encoded: false,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, defaultContext);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toStrictEqual({
      jsonrpc: "2.0",
      result: {},
      id: 123,
    });
  });

  test('should return a 202 when method is not is available', async () => {
    const event = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      // body: JSON.stringify({"jsonrpc":"2.0",method:"ping", id: 12332123 }),
      isBase64Encoded: false,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, defaultContext);

    expect(response).toBeDefined();
    expect(response.body).toStrictEqual('');
    expect(response.statusCode).toBe(202);
  })

  test('should return a 200 with method not found', async () => {
    const event = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', id:123 }),
      isBase64Encoded: false,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event, defaultContext);

    expect(response).toBeDefined();
    expect(JSON.parse(response.body)).toStrictEqual({"jsonrpc":"2.0","id":123,"error":{"code":-32601,"message":"Method not found"}});
    expect(response.statusCode).toBe(200);
  })
});

describe("mcp middleware errors cases", () => {
  test("shoud throw a 406 when the accept header is not application/json", async () => {
    const event = {
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
    } as unknown as APIGatewayProxyEvent;

    await expect(handler(event, defaultContext)).rejects.toThrowError(
      NotAcceptable
    );
  });

  test("shoud throw a 415 when the content-type header is not application/json", async () => {
    const event = {
      headers: {
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
    } as unknown as APIGatewayProxyEvent;

    await expect(handler(event, defaultContext)).rejects.toThrowError(
      UnsupportedMediaType
    );
  });
  test("shoud throw a 422 when the body is empty", async () => {
    const event = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "",
    } as unknown as APIGatewayProxyEvent;

    await expect(handler(event, defaultContext)).rejects.toThrowError(
      UnprocessableEntity
    );
  });
  test("shoud throw a 422 when the RPC messages are malformed", async () => {
    const event = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key: "value" }),
    } as unknown as APIGatewayProxyEvent;

    await expect(handler(event, defaultContext)).rejects.toThrowError(
      UnprocessableEntity
    );
  });
});

describe("compatibility with other middlewares", () => {
  test("should allow response headers to be added whatever the order of definition of the middlewares", async () => {
    const handlerWithOtherMiddlewares = middy()
      .use({
        after: (request) => {
          const headers = { "1st-middleware": "value" };
          request.response = {
            ...request.response,
            headers: { ...request.response?.headers, ...headers },
          };
        },
      })
      .use(mcpMiddleware({ server }))
      .use({
        after: (request) => {
          const headers = { "3rd-middleware": "value" };
          request.response = {
            ...request.response,
            headers: { ...request.response?.headers, ...headers },
          };
        },
      });

    const event = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "ping", id: 456 }),
      isBase64Encoded: false,
    } as unknown as APIGatewayProxyEvent;

    const response = await handlerWithOtherMiddlewares(event, defaultContext);

    expect(response.statusCode).toBe(200);
    expect(response.headers["1st-middleware"]).toBe("value");
    expect(response.headers["3rd-middleware"]).toBe("value");
  });
});
