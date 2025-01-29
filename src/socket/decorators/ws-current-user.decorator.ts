import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Socket } from "socket.io";
import { UserDocument } from "src/user/user.schema";

export const WsCurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): UserDocument => {
    const client: Socket = context.switchToWs().getClient<Socket>();
    return client.data.user;
  },
);
