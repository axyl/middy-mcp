import type middy from "@middy/core";

const mcp = (): middy.MiddlewareObj => {
  return {
    before: async (request) => {},
  };
};

export default mcp;
