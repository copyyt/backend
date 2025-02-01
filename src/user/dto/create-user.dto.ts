import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
} from "class-validator";
import { AuthType } from "../enum/auth-type.enum";

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  authId?: string;

  emailVerified?: boolean;

  @IsEnum(AuthType, { message: "invalid authtype" })
  authType: AuthType;
}
