import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Check if user is authenticated and is admin
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if user is admin (you'll need to add this check)
  const userRole = (session.user as any).role;
  if (userRole !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Green Epidemic - Admin Panel</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Welcome, {session.user.name}</span>
              <a
                href="/"
                className="text-sm bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
              >
                Back to Map
              </a>
            </div>
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}