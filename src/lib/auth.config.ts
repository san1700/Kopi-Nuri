import type { NextAuthConfig } from "next-auth";

/**
 * Konfigurasi Auth.js yang ringan dan kompatibel dengan Edge Middleware
 * (tanpa Prisma atau bcryptjs agar ukuran bundle middleware < 1 MB).
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
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
};
