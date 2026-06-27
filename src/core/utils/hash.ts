import argon2 from "argon2";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: 2,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return argon2.verify(hashedPassword, password);
}
