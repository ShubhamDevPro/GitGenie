import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isVerified: boolean
      provider?: string
      image?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    isVerified: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    isVerified: boolean
    provider?: string
    picture?: string
  }
} 