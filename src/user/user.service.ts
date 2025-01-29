import { Model, RootFilterQuery, Types } from "mongoose";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "./user.schema";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto) {
    if (await this.findOneByEmail(createUserDto.email)) {
      throw new BadRequestException({
        code: "email_exists",
        description: "Email already exists",
      });
    }
    if (createUserDto.authId) {
      if (await this.findOneByAuthId(createUserDto.authId)) {
        throw new BadRequestException({
          code: "authId_exists",
          description: "AuthId already exists",
        });
      }
    }
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findOne(
    filter: RootFilterQuery<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne(filter);
  }

  async findOneById(id: Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async findOneByAuthId(authId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ authId });
  }
  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async verifyEmail(email: string): Promise<null> {
    return this.userModel.findOneAndUpdate({ email, emailVerified: true });
  }
}
