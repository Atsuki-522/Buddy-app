import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      // バックエンドにGoogleユーザーを登録/ログイン
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            displayName: user.name,
            googleId: user.id,
          }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        (user as { jwt?: string }).jwt = data.token;
        return true;
      } catch {
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.jwt = (user as { jwt?: string }).jwt;
      }
      return token;
    },
    async session({ session, token }) {
      (session as { jwt?: string }).jwt = token.jwt as string;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
