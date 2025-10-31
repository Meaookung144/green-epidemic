'use client'

import { AppSidebar } from "@/components/admin/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    const userRole = (session?.user as any)?.role
    if (!session || (userRole !== 'ADMIN' && userRole !== 'VOLUNTEER')) {
      router.push('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">
              {session?.user?.name || session?.user?.email}
            </span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              {(session?.user as any)?.role}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 bg-gray-50 min-h-screen">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}