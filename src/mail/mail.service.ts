import { Injectable } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";
import handlebars from "handlebars";
import { MailAddress } from "./interfaces/mail-address.interface";
import { sendEmailZepto } from "./clients/zeptomail.client";
import { ConfigService } from "@nestjs/config";
import { sendEmailBrevo } from "./clients/brevo.client";

@Injectable()
export class MailService {
  constructor(private configService: ConfigService) {}
  getTemplate(templateFile: string) {
    const templatePath = path.join(
      process.cwd(),
      `src/mail/templates/${templateFile}`,
    );
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(templateSource);
    return template;
  }

  getHtmlString(templateFile: string, context: any) {
    const template = this.getTemplate(templateFile);
    return template(context);
  }

  send(
    addresses: MailAddress[],
    subject: string,
    templateFile: string,
    context: any,
    client: "zepto" | "brevo" = "zepto",
  ) {
    const htmlString = this.getHtmlString(templateFile, context);

    if (client === "brevo") {
      return sendEmailBrevo(
        addresses,
        subject,
        htmlString,
        this.configService.get("BREVO_API_TOKEN"),
      );
    }
    return sendEmailZepto(
      addresses,
      subject,
      htmlString,
      this.configService.get("ZOHO_API_TOKEN"),
    );
  }
}
