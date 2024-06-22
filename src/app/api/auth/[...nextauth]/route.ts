import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

const users = [
  {
    id: 1,
    name: 'John Doe',
    email: 'dummy@groq.com',
    password: bcrypt.hashSync('groqspeed', 10),
  },
  // Add more users as needed
];

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: { username: string; password: string } | undefined, req: any) {
        if (!credentials) {
          return null;
        }

        const user = users.find(
          (u) => u.email === credentials.username
        );

        if (user && bcrypt.compareSync(credentials.password, user.password)) {
          return { id: user.id.toString(), name: user.name, email: user.email };
        } else {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user.id = token.id;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
