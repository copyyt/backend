import { UserDocument } from "../user.schema";

export class UserDto {
  id: string;
  name: string;
  email: string;
  authId: string;
  phoneNumber: string;
  emailVerified: boolean;
  phoneVerified: boolean;

  constructor(user: UserDocument) {
    this.id = user._id.toString(); // Convert ObjectId to string
    this.name = user.name;
    this.email = user.email;
    this.emailVerified = user.emailVerified;
    this.authId = user.authId;
  }
}
