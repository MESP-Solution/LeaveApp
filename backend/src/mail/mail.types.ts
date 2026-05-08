export type MailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export type MailSenderCredentials = {
  smtpUser: string;
  smtpPass: string;
  from?: string;
};
