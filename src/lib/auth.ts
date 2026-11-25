import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginAttempts,
} from "@/lib/auth-rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user.id as string) ?? "";
        token.role = (user as { role: string }).role;
        token.branchId = (user as { branchId: string }).branchId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const userObj = session.user as unknown as {
          role: string;
          branchId: string;
        };
        userObj.role = token.role as string;
        userObj.branchId = token.branchId as string;
      }
      return session;
    },
  },
});
