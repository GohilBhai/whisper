import crypto from "crypto";

export const generateResetToken = () => {
  const token = crypto.randomBytes(20).toString("hex");
  //   console.log(token); // 92fe4b023bdb597eb4bdb6d42a41045cf1071d15

  // hash token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  //   console.log(hashedToken); // 30229a63a50d89b58207a2a6e26e30c7dc8f9d97b996661c8497fe61b60d5952
  // return { token, hashedToken };
};
