import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { AuthType } from "./enum/auth-type.enum";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false, unique: true })
  authId: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: String,
    enum: AuthType,
    default: AuthType.EMAIL,
  })
  authType: AuthType;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ type: Array })
  connections: [];
}

export const UserSchema = SchemaFactory.createForClass(User);
