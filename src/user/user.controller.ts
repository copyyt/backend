import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "src/auth/auth.guard";
import { ApiBearerAuth } from "@nestjs/swagger";
import { AuthenticatedRequest } from "src/auth/interfaces/request.interface";

@Controller("api/v1/user")
export class UserController {
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get("/last-message")
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      messsage: "Last message",
      data: req.user?.lastMessage ?? "",
    };
  }
}
