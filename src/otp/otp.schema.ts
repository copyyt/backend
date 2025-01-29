import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OTPDocument = HydratedDocument<OTP>;

@Schema({ timestamps: true })
export class OTP {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  code: number;

  @Prop({ required: true })
  expiresAt: Date;
}

export const OTPSchema = SchemaFactory.createForClass(OTP);

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
