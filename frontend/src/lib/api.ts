import axios from "axios";
import { getSession, signOut } from "next-auth/react";


const api_key = process.env.NEXT_PUBLIC_API_KEY;

const axiosInstance = axios.create({
    baseURL: api_key || "http://localhost:4050"
});

axiosInstance.interceptors.request.use(
    async (config) => {
        const session = await getSession();
        const token = session?.user?.accessToken;
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

axiosInstance.interceptors.response.use(
    (response) => response,
    async(error) =>{
        if(error.response?.status === 401){
            await signOut({ redirect: true, callbackUrl: '/sign-in'})
        }
        return Promise.reject(error);
    }
)

export default axiosInstance;
