import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";

// Rate limit login staf: maksimal 5 percobaan gagal, lockout 15 menit per username
const staffLoginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_STAFF_ATTEMPTS = 5;
const STAFF_LOCKOUT_MS = 15 * 60 * 1000;

function isStaffRateLimited(username: string): boolean {
  const record = staffLoginAttempts.get(username);
  if (!record) return false;
  if (Date.now() - record.lastAttempt > STAFF_LOCKOUT_MS) {
    staffLoginAttempts.delete(username);
    return false;
  }
  return record.count >= MAX_STAFF_ATTEMPTS;
}

function recordStaffFailedAttempt(username: string): void {
  const now = Date.now();
  const record = staffLoginAttempts.get(username);
  if (!record || now - record.lastAttempt > STAFF_LOCKOUT_MS) {
    staffLoginAttempts.set(username, { count: 1, lastAttempt: now });
  } else {
    staffLoginAttempts.set(username, { count: record.count + 1, lastAttempt: now });
  }
}

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
        if (isStaffRateLimited(username)) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.isActive) {
          recordStaffFailedAttempt(username);
          return null;
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          recordStaffFailedAttempt(username);
          return null;
        }

        staffLoginAttempts.delete(username);

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

