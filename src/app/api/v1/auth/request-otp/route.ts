import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';

// Configure nodemailer with Yahoo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mail.yahoo.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { email, password, name, gender, language } = data;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limitResult = await rateLimit(`otp:${email}:${ip}`, 3, 600); // 3 attempts per 10 mins
    
    if (!limitResult.success) {
      return NextResponse.json({ error: 'Too many OTP requests. Try again later.' }, { status: 429 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis (expires in 10 minutes)
    const payload = JSON.stringify({ otp, email, password, name, gender, language });
    await redis.set(`auth:otp:${email}`, payload, 'EX', 600);

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Sonexa Music" <aswin@rcssoft.com>',
      to: email,
      subject: 'Your Sonexa Music Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h2 style="color: #10b981;">Welcome to Sonexa Music!</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Please use the following OTP to verify your email and complete your registration:</p>
          <div style="background-color: #f3f4f6; padding: 16px; font-size: 24px; letter-spacing: 4px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'OTP sent successfully' });
  } catch (error: any) {
    logger.error({ err: error, email: (await request.clone().json().catch(() => ({}))).email }, 'Error sending OTP');
    return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 });
  }
}
