import { Logger, UnauthorizedException } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  WsException,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UserDocument } from "src/user/user.schema";
import { WsCurrentUser } from "./decorators/ws-current-user.decorator";
import { SocketService } from "./socket.service";
import { UserService } from "src/user/user.service";
import { uniq } from "lodash";

@WebSocketGateway(8001, {
  cors: {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(",") || [],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS".split(","),
    credentials: true,
    allowedHeaders: ["Authorization", "authorization"],
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger("SocketGateway");

  constructor(
    private socketService: SocketService,
    private userService: UserService,
  ) {}

  isSocketActive(socketId: string): boolean {
    if (!this.server) {
      throw new Error("Socket.IO server instance is not initialized.");
    }
    const socket = this.server.sockets.sockets.get(socketId);
    return socket ? socket.connected : false;
  }

  private async initializeUserConnection(
    user: UserDocument,
    socket: Socket,
  ): Promise<void> {
    socket.data.user = user;

    // delete disconnected connections
    const connections = await this.userService.getConnections(user._id);
    if (connections) {
      const activeConnections = connections.filter((connection) =>
        this.isSocketActive(connection),
      );
      if (activeConnections.length !== connections.length) {
        await this.userService.setConnections(user._id, activeConnections);
      }
    }
    await this.userService.addConnection(user._id, socket.id);
    this.logger.log(
      `Client connected: ${socket.id} - User ID: ${user._id.toString()}`,
    );
  }

  private handleConnectionError(socket: Socket, error: Error): void {
    this.logger.error(
      `Connection error for socket ${socket.id}: ${error.message}`,
    );
    socket.emit("exception", "Authentication error");
    socket.disconnect();
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const user = await this.socketService.authenticateSocket(socket);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }
      await this.initializeUserConnection(user, socket);
    } catch (error) {
      this.handleConnectionError(socket, error);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    if (socket.data.user?._id) {
      this.userService.removeConnection(socket.data.user._id, socket.id);
    }
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  @SubscribeMessage("message")
  async onMessage(
    @WsCurrentUser() currentUser: UserDocument,
    @MessageBody() message: any,
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    try {
      const connections = await this.userService.getConnections(
        currentUser._id,
      );
      if (message) {
        this.userService.setLastMessage(currentUser._id, String(message));
      }
      uniq([...(connections ?? []), socket.id]).forEach((connection) => {
        this.server.to(connection).emit("message", message);
      });
    } catch (error) {
      this.logger.error(
        `Failed to send message ${currentUser._id.toString()} by User ID ${currentUser._id.toString()}: ${error.message}`,
        error.stack,
      );
      throw new WsException("Error occurred while responding.");
    }
  }
}
