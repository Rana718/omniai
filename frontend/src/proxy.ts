import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authMiddleware = withAuth(
    function middleware() {
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export default function proxy(req: NextRequest) {
    return (authMiddleware as (req: NextRequest) => Response | Promise<Response>)(req);
}

export const config = {
    matcher: ["/((?!sign-in|sign-up|$).*)"],
};
