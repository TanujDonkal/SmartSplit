import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user,
      pass,
    },
  });
}

export async function sendPasswordResetOtpEmail(params: {
  to: string;
  name: string;
  otp: string;
}): Promise<void> {
  const transport = createTransport();
  const from = process.env.SMTP_FROM;

  if (!transport || !from) {
    throw new Error("Email delivery is not configured on the server");
  }

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
}
