import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

const api_key = process.env.NEXT_PUBLIC_API;

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    console.log("Missing credentials");
                    return null;
                }

                try {
                    const response = await axios.post(`${api_key}/auth/login`, {
                        email: credentials.email,
                        password: credentials.password,
                    });

                    const authData = response.data;

                    if (!authData?.access_token || !authData?.user) {
                        console.error("Missing fields in auth response");
                        return null;
                    }

                    return {
                        id: authData.user?.id || "",
                        email: authData.user.email,
                        name: authData.user.name,
                        accessToken: authData.access_token,
                    };
                } catch (error: any) {
                    console.error(
                        "Auth error:",
                        error?.response?.data || error.message,
                    );
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: "/sign-in",
        signOut: "/",
        error: "/sign-in",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.email = user.email;
                token.name = user.name;
                token.accessToken = user.accessToken;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user = {
                    email: token.email,
                    name: token.name,
                    accessToken: token.accessToken,
                };
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
        updateAge: 24 * 60 * 60, 
    },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };
