import { IsEmail, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  code: number;
}
