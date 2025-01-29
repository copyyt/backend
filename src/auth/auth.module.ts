import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";
import {
  RefreshToken,
  RefreshTokenSchema,
} from "./schemas/refresh-token.schema";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "src/user/user.module";
import { MailModule } from "src/mail/mail.module";
import { OtpModule } from "src/otp/otp.module";

@Module({
  imports: [
    UserModule,
    MailModule,
    OtpModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
