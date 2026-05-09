import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MailMessage, MailSenderCredentials } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private hasLoggedMissingApiKey = false;
  private readonly mailFrom: string | null;

  constructor(private readonly configService: ConfigService) {
    this.mailFrom = this.configService.get<string>('MAIL_FROM')?.trim() || null;
  }

  async send(
    message: MailMessage,
    sender: MailSenderCredentials,
  ): Promise<void> {
    const apiKey = sender.smtpPass?.trim();
    if (!apiKey) {
      if (!this.hasLoggedMissingApiKey) {
        this.logger.warn(
          'Resend API key missing (smtp_pass); skipping outgoing email',
        );
        this.hasLoggedMissingApiKey = true;
      }
      return;
    }

    const from =
      sender.from?.trim() || this.mailFrom || sender.smtpUser?.trim();
    if (!from) {
      this.logger.warn(
        'Sender from address missing; skipping outgoing email for this request',
      );
      return;
    }

    const toList = Array.isArray(message.to) ? message.to : [message.to];
    this.logger.debug(
      `Sending email via Resend to=${toList.join(',')} subject="${message.subject}"`,
    );

    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      if (error) {
        this.logger.error(
          `Resend send failed to=${toList.join(',')} subject="${message.subject}": ${error.message}`,
        );
        return;
      }

      this.logger.debug(
        `Resend accepted email to=${toList.join(',')} id=${data?.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Resend send failed to=${toList.join(',')} subject="${message.subject}"`,
        (error as Error)?.stack,
      );
    }
  }
}
