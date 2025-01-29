import axios from "axios";
import { MailAddress } from "../interfaces/mail-address.interface";

export const sendEmailBrevo = async (
  addresses: MailAddress[],
  subject: string,
  htmlString: string,
  authToken: string | undefined,
) => {
  const url = "https://api.sendinblue.com/v3/smtp/email";
  const body = {
    sender: { email: "fastpoint@psami.com", name: "Fast Point" },
    to: addresses,
    subject,
    htmlContent: htmlString,
  };
  try {
    const response = await axios.post(url, body, {
      headers: {
        "api-key": authToken,
      },
    });
    console.log(response.data);
    return true;
  } catch (err: any) {
    console.log(err.response.data);
    // console.error(err);
    return false;
  }
};
