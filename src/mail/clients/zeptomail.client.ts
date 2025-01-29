import axios from "axios";
import { MailAddress } from "../interfaces/mail-address.interface";

export const sendEmailZepto = async (
  addresses: MailAddress[],
  subject: string,
  htmlString: string,
  authToken: string | undefined,
) => {
  const url = "https://api.zeptomail.com/v1.1/email";
  const body = JSON.stringify({
    from: { address: "fastpoint@psami.com", name: "Fast Point" },
    to: addresses.map((address) => ({
      email_address: { address: address.email, name: address.name },
    })),
    subject,
    htmlbody: htmlString,
  });
  try {
    await axios.post(url, body, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authToken,
      },
    });
    return true;
  } catch (err: any) {
    console.log(err.response.data.error.details);
    // console.error(err);
    return false;
  }
};
