import amqp, { ConsumeMessage } from "amqplib";
import dotenv from "dotenv";
import * as SibApiV3Sdk from '@sendinblue/client';

dotenv.config();

const sendOtpEmail = async (to: string, subject: string, body: string) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY!
  );

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.textContent = body;
  sendSmtpEmail.sender = { 
    name: 'TalkSphere', 
    email: 'premkumar2186@gmail.com'
  };
  sendSmtpEmail.to = [{ email: to }];

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent successfully via Brevo to:', to);
  } catch (error: any) {
    console.error('❗️ Brevo failed to send email:', error.body || error);
  }
};

export const startSendOtpConsumer = async () => {
  try {
    const connectionUrl = process.env.CLOUDAMQP_URL;
    if (!connectionUrl) {
      throw new Error("CLOUDAMQP_URL environment variable is not set!");
    }

    const connection = await amqp.connect(connectionUrl);
    const channel = await connection.createChannel();
    const queueName = "send-otp";
    await channel.assertQueue(queueName, { durable: true });

    console.log("✅ Mail Service consumer started, listening for otp emails");

    channel.consume(queueName, async (msg: ConsumeMessage | null) => {
      if (msg) {
        try {
          const { to, subject, body } = JSON.parse(msg.content.toString());
          await sendOtpEmail(to, subject, body);
          console.log(`[📨] Received email task for: ${to}`);
        } catch (error) {
          console.error("❗️ Failed to process message from queue:", error);
        } finally {
          channel.ack(msg);
        }
      }
    });
  } catch (error) {
    console.error("❗️ Failed to start RabbitMQ consumer:", error);
  }
};
