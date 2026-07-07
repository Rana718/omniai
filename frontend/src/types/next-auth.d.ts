
declare module "next-auth" {
    interface Session {
        user: {
            email: string;
            name: string;
            image?: string;
            accessToken: string;
        };
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
