import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { OTP } from "./otp.schema";
import { UserDocument } from "src/user/user.schema";
import * as crypto from "crypto";

const otpExpiryMinutes = 10;

@Injectable()
export class OtpService {
  constructor(@InjectModel(OTP.name) private otpModel: Model<OTP>) {}

  generateOTP(length: number = 6): number {
    return crypto.randomInt(10 ** (length - 1), 10 ** length);
  }

  async generateOtpForUser(user: UserDocument, length: number = 6) {
    const code = this.generateOTP(length);
    await this.otpModel.deleteMany({ email: user.email });
    const expiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000); // 10 minutes from now
    const newOTP = new this.otpModel({ email: user.email, code, expiresAt });
    await newOTP.save();
    return code;
  }

  async verifyOTP(email: string, code: number): Promise<boolean> {
    const record = await this.otpModel.findOne({ email, code });

    if (!record) {
      return false;
    }

    if (record.expiresAt < new Date()) {
      return false;
    }

    await this.otpModel.deleteOne({ _id: record._id });
    return true;
  }
}
