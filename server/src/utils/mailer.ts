import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

type IPv4SMTPTransportOptions = SMTPTransport.Options & {
  family: 4;
  lookup: typeof lookupIpv4;
};

function lookupIpv4(hostname: string, options: unknown, callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) {
  const normalizedOptions =
    typeof options === "object" && options !== null ? (options as dns.LookupOneOptions) : {};

  dns.lookup(
    hostname,
    {
      ...normalizedOptions,
      family: 4,
      all: false,
    },
    callback,
  );
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const transportOptions: IPv4SMTPTransportOptions = {
    host: host || "smtp.gmail.com",
    port,
    secure: String(process.env.SMTP_SECURE ?? "true").toLowerCase() === "true",
    family: 4,
    lookup: lookupIpv4,
    auth: {
      user,
      pass,
    },
  };

  return nodemailer.createTransport(transportOptions as SMTPTransport.Options);
}

export async function sendPasswordResetOtpEmail(params: {
  to: string;
  name: string;
  otp: string;
}): Promise<void> {
  const transport = createTransport();
  const from = process.env.SMTP_FROM;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure = String(process.env.SMTP_SECURE ?? "true").toLowerCase() === "true";

  if (!transport || !from) {
    throw new Error("Email delivery is not configured on the server");
  }

  try {
    await transport.sendMail({
      from,
      to: params.to,
      subject: "SmartSplit password reset OTP",
      text: `Hi ${params.name}, your SmartSplit OTP is ${params.otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#1f2937">
          <h2 style="margin-bottom:8px;color:#355d74;">SmartSplit password reset</h2>
          <p>Hi ${params.name},</p>
          <p>Use this OTP to reset your password:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#36b5ac;">${params.otp}</p>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("SMTP sendMail error:", {
      message: error instanceof Error ? error.message : "Unknown SMTP error",
      name: error instanceof Error ? error.name : undefined,
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure,
      to: params.to,
    });
    throw error;
  }
}
