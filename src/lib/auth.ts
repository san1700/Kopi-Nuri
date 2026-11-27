import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginAttempts,
} from "@/lib/auth-rate-limit";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = String(credentials.username).trim().toLowerCase();
        const rateKey = `staff:${username}`;

        const rateCheck = await checkLoginRateLimit(rateKey);
        if (!rateCheck.allowed) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.isActive) {
          await recordLoginFailure(rateKey);
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          await recordLoginFailure(rateKey);
          return null;
        }

        await resetLoginAttempts(rateKey);

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          branchId: user.branchId,
        };
      },
    }),
  ],
});
