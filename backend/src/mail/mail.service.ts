import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter, createTransport } from 'nodemailer';
import { MailMessage, MailSenderCredentials } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly smtpHost: string | null;
  private readonly smtpPort: number | null;
  private readonly smtpSecure: boolean;
  private hasLoggedMissingSmtpHostConfig = false;
  private hasLoggedInvalidSmtpPort = false;

  constructor(private readonly configService: ConfigService) {
    this.smtpHost = this.configService.get<string>('SMTP_HOST')?.trim() ?? null;
    const portValue = this.configService.get<string>('SMTP_PORT')?.trim();
    const parsedPort = Number(portValue);
    this.smtpPort =
      Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : null;
    const secureValue = this.configService
      .get<string>('SMTP_SECURE')
      ?.trim()
      .toLowerCase();
    this.smtpSecure = secureValue === 'true';
  }

  async send(
    message: MailMessage,
    sender: MailSenderCredentials,
  ): Promise<void> {
    if (!this.smtpHost) {
      if (!this.hasLoggedMissingSmtpHostConfig) {
        this.logger.warn(
          'SMTP_HOST missing; skipping all outgoing email until configured',
        );
        this.hasLoggedMissingSmtpHostConfig = true;
      }
      return;
    }

    if (!this.smtpPort) {
      if (!this.hasLoggedInvalidSmtpPort) {
        this.logger.warn(
          'SMTP_PORT invalid; skipping all outgoing email until fixed',
        );
        this.hasLoggedInvalidSmtpPort = true;
      }
      return;
    }

    const smtpUser = sender.smtpUser?.trim();
    const smtpPass = sender.smtpPass?.trim();
    if (!smtpUser || !smtpPass) {
      this.logger.warn(
        'Sender SMTP credentials missing; skipping outgoing email for this request',
      );
      return;
    }

    const from = sender.from?.trim() || smtpUser;
    const transporter = this.createSmtpTransporter(
      this.smtpHost,
      this.smtpPort,
      this.smtpSecure,
      smtpUser,
      smtpPass,
    );
    const toList = Array.isArray(message.to) ? message.to : [message.to];
    this.logger.debug(
      `Sending email via SMTP to=${toList.join(',')} subject="${message.subject}"`,
    );

    await this.sendViaSmtp(transporter, message, toList, from);
  }

  private createSmtpTransporter(
    host: string,
    port: number,
    secure: boolean,
    user: string,
    pass: string,
  ): Transporter {
    return createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  private async sendViaSmtp(
    transporter: Transporter,
    message: MailMessage,
    toList: string[],
    from: string,
  ): Promise<void> {
    try {
      const info = await transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.logger.debug(
        `SMTP accepted email to=${toList.join(',')} messageId=${info.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `SMTP send failed to=${toList.join(',')} subject="${message.subject}"`,
        (error as Error)?.stack,
      );
    }
  }
}
