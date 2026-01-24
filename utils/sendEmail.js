import nodemailer from "nodemailer";

const sendMail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: "<whispr@gmail.com>",
    to: options.email,
    subject: "Password Reset",
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendMail;
