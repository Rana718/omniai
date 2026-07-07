import type { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            email: string;
            name: string;
            image?: string;
            accessToken: string;
        } & DefaultSession["user"];
    }

    interface User {
        email: string;
        name: string;
        image?: string;
        accessToken: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        email: string;
        name: string;
        accessToken: string;
    }
}
