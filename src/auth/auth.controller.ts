import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { SignUpDto } from "./dto/sign-up.dto";
import { AuthService } from "./auth.service";
import { SignInDto } from "./dto/sign-in.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ResendOtpEmailDto } from "./dto/resend-otp-email.dto";
import { AuthGuard } from "./auth.guard";
import { AuthenticatedRequest } from "./interfaces/request.interface";
import { UserDto } from "src/user/dto/user.dto";
import { ApiBearerAuth } from "@nestjs/swagger";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@Controller("api/v1/auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("/sign-up")
  async signUp(
    @Body() signUpData: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; accessToken: string; user: UserDto }> {
    const userAccess = await this.authService.signUpEmail(signUpData);
    response
      .status(HttpStatus.CREATED)
      .cookie("refreshToken", userAccess.refreshToken, {
        httpOnly: true,
      });
    return {
      message: "Signup Successful",
      ...userAccess,
    };
  }

  @Post("/sign-in")
  async signIn(
    @Body() signInData: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; accessToken: string; user: UserDto }> {
    const userAccess = await this.authService.signInEmail(signInData);
    response
      .status(HttpStatus.OK)
      .cookie("refreshToken", userAccess.refreshToken, {
        httpOnly: true,
      });
    return {
      message: "Signin Successful",
      ...userAccess,
    };
  }

  @Post("/refresh-tokens")
  async refreshTokens(
    @Req() req: Request,
    @Body() data: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; accessToken: string; user: UserDto }> {
    let refreshToken = data.refreshToken;
    if (!refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }
    if (!refreshToken) {
      throw new BadRequestException({
        code: "refresh_token_not_found",
        description: "Refresh token not in request or cookie",
      });
    }
    const userAccess = await this.authService.refreshTokens(refreshToken);
    response
      .status(HttpStatus.OK)
      .cookie("refreshToken", userAccess.refreshToken, {
        httpOnly: true,
      });
    return {
      message: "Token refresh successful",
      ...userAccess,
    };
  }

  @Post("/verify-email")
  async verifyEmail(
    @Body() data: VerifyEmailDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const resp = await this.authService.verifyEmail(data);
    response.status(HttpStatus.OK);
    return resp;
  }

  @UseGuards(AuthGuard)
  @Post("/resend-email-otp")
  async resendEmailOtp(
    @Body() data: ResendOtpEmailDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const resp = await this.authService.resendEmailVerificationOtp(data);
    response.status(HttpStatus.OK);
    return resp;
  }

  @Post("/google-auth")
  async socialAuth(
    @Body() data: GoogleAuthDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const userData = await this.authService.verifyGoogleAuthToken(data.token);
    const userAccess = await this.authService.signGoogle(userData);
    response
      .status(HttpStatus.OK)
      .cookie("refreshToken", userAccess.refreshToken, {
        httpOnly: true,
      });
    return {
      message: "Google Auth Successful",
      ...userAccess,
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get("/profile")
  getProfile(@Req() req: AuthenticatedRequest) {
    return new UserDto(req.user);
  }
}
