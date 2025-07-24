import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

const isRequestMessage = (
  message: JSONRPCMessage
): message is JSONRPCMessage & { id: number } =>
  "method" in message && "id" in message;

const isResponseMessage = (
  message: JSONRPCMessage
): message is JSONRPCMessage & { id: number } => "id" in message;

export class HttpServerTransport implements Transport {
  private _started = false;
  private _pendingRequests = new Map<
    number,
    {
      resolve: (message: JSONRPCMessage) => void;
      reject: (error: Error) => void;
    }
  >();

  public onmessage?: (message: JSONRPCMessage) => void;

  public start = async () => {
    if (this._started) {
      throw new Error("HttpServerTransport already started");
    }
    this._started = true;
  };

  public send = async (message: JSONRPCMessage) => {
    if (isResponseMessage(message)) {
      const pendingRequest = this._pendingRequests.get(message.id);
      if (pendingRequest !== undefined) {
        pendingRequest.resolve(message);
        this._pendingRequests.delete(message.id);
      }
    }
  };

  public close = async () => {};

  private _startFreshSession = () => {
    this._pendingRequests.clear();
  };

  public handleJSONRPCMessages = async (
    jsonRPCMessages: JSONRPCMessage[]
  ): Promise<JSONRPCMessage[] | JSONRPCMessage | undefined> => {
    this._startFreshSession();

    const requestMessages = jsonRPCMessages.filter(isRequestMessage);



    // Create promises for each request and collect their responses
    const responseMessagesPromises = Promise.all(
      requestMessages.map(
        (requestMessage) =>
          new Promise<JSONRPCMessage>((resolve, reject) => {
            this._pendingRequests.set(requestMessage.id, { resolve, reject });
          })
      )
    );
    jsonRPCMessages.map((message) => {
      this.onmessage?.(message);
    });

    if (requestMessages.length === 0) {
      return;
    }
    const responseMessages = await responseMessagesPromises


    return responseMessages.length > 1 ? responseMessages : responseMessages[0];
  };
}
