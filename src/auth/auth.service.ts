import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthType } from "src/user/enum/auth-type.enum";
import { UserService } from "src/user/user.service";
import { SignUpDto } from "./dto/sign-up.dto";
import { JwtService } from "@nestjs/jwt";
import { UserDocument } from "src/user/user.schema";
import { SignInDto } from "./dto/sign-in.dto";
import { UserDto } from "src/user/dto/user.dto";
import { MailService } from "src/mail/mail.service";
import { OtpService } from "src/otp/otp.service";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ResendOtpEmailDto } from "./dto/resend-otp-email.dto";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import { RefreshToken } from "./schemas/refresh-token.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { GoogleUser } from "./interfaces/google-user.interface";

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailService: MailService,
    private otpService: OtpService,
    private configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
  ) {}

  async verifyGoogleAuthToken(token: string) {
    try {
      const userInfoUrl =
        "https://www.googleapis.com/oauth2/v1/userinfo?alt=json";

      const response = await axios.get<GoogleUser>(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status !== HttpStatus.OK) {
        throw new UnauthorizedException({
          code: "invalid_token",
          description: `Unable to parse authentication token.`,
        });
      }
      return response.data;
    } catch (error) {
      throw new UnauthorizedException({
        code: "invalid_token",
        description: `Unable to parse authentication token. ${error.message}`,
      });
    }
  }

  async hashPassword(password: string) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(password, salt);
    return hash;
  }

  async verifyPasswordHash(password: string, hash: string) {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  }

  async generateRefreshTokenForUser(user: UserDocument): Promise<string> {
    const payload = { sub: user._id.toString(), email: user.email };

    const token = await this.jwtService.signAsync(payload, {
      expiresIn: `${this.configService.get<string>("REFRESH_TOKEN_EXPIRE_DAYS")}d`,
      secret: this.configService.get<string>("REFRESH_SECRET_KEY"),
    });

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() +
        Number(this.configService.get<string>("REFRESH_TOKEN_EXPIRE_DAYS")),
    );

    await this.refreshTokenModel.findOneAndUpdate(
      { userId: user._id },
      { token, expiresAt },
      { upsert: true, new: true },
    );

    return token;
  }

  async generateAccessTokenForUser(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: `${this.configService.get<string>("ACCESS_TOKEN_EXPIRE_MINUTES")}m`,
      secret: this.configService.get<string>("SECRET_KEY"),
    });
    return token;
  }

  async generateTokensForUser(user: UserDocument) {
    const accessToken = await this.generateAccessTokenForUser(user);
    const refreshToken = await this.generateRefreshTokenForUser(user);

    return { accessToken, refreshToken, user: new UserDto(user) };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserDto }> {
    const storedToken = await this.refreshTokenModel.findOne({
      token: refreshToken,
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.userService.findOneById(storedToken.userId);

    if (!user) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    return await this.generateTokensForUser(user);
  }

  async signGoogle(userData: GoogleUser): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserDto;
  }> {
    let user = await this.userService.findOne({
      authId: userData.id,
      authType: AuthType.GOOGLE,
    });

    if (!user) {
      user = await this.userService.create({
        email: userData.email,
        name: userData.name,
        authId: userData.id,
        authType: AuthType.GOOGLE,
        emailVerified: userData.verified_email,
        password: userData.id,
      });
    }

    return await this.generateTokensForUser(user);
  }

  async signUpEmail(signupData: SignUpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserDto;
  }> {
    const user = await this.userService.create({
      ...signupData,
      authType: AuthType.EMAIL,
      password: await this.hashPassword(signupData.password),
    });

    const otp = await this.otpService.generateOtpForUser(user);

    this.mailService.send(
      [{ name: user.name, email: user.email }],
      "Verify your Email",
      "verify-email.template.html",
      { code: otp },
    );

    return await this.generateTokensForUser(user);
  }

  async signInEmail(signInData: SignInDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserDto;
  }> {
    const user = await this.userService.findOneByEmail(signInData.email);
    if (!user) {
      throw new NotFoundException();
    }
    if (!this.verifyPasswordHash(signInData.password, user?.password)) {
      throw new UnauthorizedException();
    }
    return await this.generateTokensForUser(user);
  }

  // TODO: Protect with Auth
  async resendEmailVerificationOtp(data: ResendOtpEmailDto): Promise<{
    message: string;
  }> {
    const user = await this.userService.findOneByEmail(data.email);
    if (!user) {
      throw new NotFoundException();
    }

    const otp = await this.otpService.generateOtpForUser(user);

    this.mailService.send(
      [{ name: user.name, email: user.email }],
      "Verify your Email",
      "verify-email.template.html",
      { code: otp },
    );

    return {
      message: "Email Sent",
    };
  }

  async verifyEmail(verifyEmailData: VerifyEmailDto): Promise<{
    message: string;
  }> {
    const validOtp = await this.otpService.verifyOTP(
      verifyEmailData.email,
      verifyEmailData.code,
    );
    if (!validOtp) {
      throw new UnauthorizedException();
    }
    await this.userService.verifyEmail(verifyEmailData.email);
    return {
      message: "Email Verified",
    };
  }
}
