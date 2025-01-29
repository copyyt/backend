import { Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
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
import { UserService } from "src/user/user.service";
import { WsCurrentUser } from "./decorators/ws-current-user.decorator";

@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger("SocketGateway");

  constructor(
    private readonly jwtService: JwtService,
    private configService: ConfigService,
    private userService: UserService,
  ) {}

  private extractJwtToken(socket: Socket) {
    const authHeader = socket.handshake.headers.authorization;
    if (!authHeader)
      throw new UnauthorizedException("No authorization header found");

    const [bearer, token] = authHeader.split(" ");
    if (bearer !== "Bearer" || !token)
      throw new UnauthorizedException("Invalid or missing token");

    return token;
  }

  private async authenticateSocket(socket: Socket) {
    const token = this.extractJwtToken(socket);
    const payload = await this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>("SECRET_KEY"),
    });
    return await this.userService.findOneById(payload.sub);
  }

  private async initializeUserConnection(
    user: UserDocument,
    socket: Socket,
  ): Promise<void> {
    socket.data.user = user;
    this.server.to(socket.id).emit("userAllRooms", [user._id.toString()]);
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
      const user = await this.authenticateSocket(socket);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }
      await this.initializeUserConnection(user, socket);
    } catch (error) {
      this.handleConnectionError(socket, error);
    }
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  @SubscribeMessage("userEmail")
  async onFindAllMessages(
    @WsCurrentUser() currentUser: UserDocument,
    @MessageBody() message: any,
    @ConnectedSocket() socket: Socket,
  ): Promise<void> {
    try {
      this.server
        .to(socket.id)
        .emit("message", { email: currentUser.email, message: message });
    } catch (error) {
      this.logger.error(
        `Failed to fetch messages for Room ID ${currentUser._id.toString()} by User ID ${currentUser._id.toString()}: ${error.message}`,
        error.stack,
      );
      throw new WsException("Error occurred while fetching messages.");
    }
  }
}
