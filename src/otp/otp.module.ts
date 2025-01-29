import { Module } from "@nestjs/common";
import { OtpService } from "./otp.service";
import { MongooseModule } from "@nestjs/mongoose";
import { OTP, OTPSchema } from "./otp.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: OTP.name, schema: OTPSchema }])],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
