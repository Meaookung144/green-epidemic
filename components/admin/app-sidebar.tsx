'use client'

import {
  BarChart3,
  ChevronUp,
  FileText,
  Users,
  Activity,
  Brain,
  Shield,
  Video,
  MessageSquareText,
  Upload,
  Home,
  LogOut,
  Settings
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const navigation = [
  {
    title: "หน้าหลัก",
    icon: Home,
    href: "/admin",
  },
  {
    title: "รายงาน",
    icon: FileText,
    href: "/admin/reports",
  },
  {
    title: "ผู้ใช้งาน",
    icon: Users,
    href: "/admin/users",
  },
  {
    title: "สถิติ",
    icon: BarChart3,
    href: "/admin/statistics",
  },
  {
    title: "วิเคราะห์ AI",
    icon: Brain,
    items: [
      {
        title: "การวิเคราะห์ปัจจุบัน",
        href: "/admin/ai-analysis",
      },
      {
        title: "ประวัติการวิเคราะห์",
        href: "/admin/ai-analysis/history",
      },
    ],
  },
  {
    title: "ประเมินความเสี่ยง",
    icon: Shield,
    href: "/admin/risk-assessment",
  },
  {
    title: "การรักษาทางไกล",
    icon: Video,
    href: "/admin/telemedicine",
  },
  {
    title: "ประวัติ AI Chat",
    icon: MessageSquareText,
    href: "/admin/ai-chat-history",
  },
  {
    title: "สถิติสุขภาพจำนวนมาก",
    icon: Upload,
    href: "/admin/bulk-health-stats",
  },
]

export function AppSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold text-green-700">
            Green Epidemic Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.items ? (
                    <Collapsible className="group/collapsible">
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                          <ChevronUp className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton 
                                asChild
                                isActive={pathname === subItem.href}
                              >
                                <Link href={subItem.href}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton 
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href!}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">
                      {session?.user?.name?.charAt(0) || 'A'}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">
                        {session?.user?.name || session?.user?.email}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(session?.user as any)?.role}
                      </span>
                    </div>
                  </div>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center">
                    <Home className="w-4 h-4 mr-2" />
                    กลับสู่หน้าแผนที่
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    ตั้งค่า
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="flex items-center text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}