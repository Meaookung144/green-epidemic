import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      homeLatitude?: number | null
      homeLongitude?: number | null
      lineId?: string | null
    }
  }

  interface User {
    id: string
    role: string
    homeLatitude?: number | null
    homeLongitude?: number | null
    lineId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    homeLatitude?: number | null
    homeLongitude?: number | null
    lineId?: string | null
  }
}