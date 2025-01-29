import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";
import { UserService } from "src/user/user.service";

@Injectable()
export class SocketService {
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

  async authenticateSocket(socket: Socket) {
    const token = this.extractJwtToken(socket);
    const payload = await this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>("SECRET_KEY"),
    });
    return await this.userService.findOneById(payload.sub);
  }
}
