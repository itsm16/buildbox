import { AppSidebar } from "@/components/app-sidebar";
import Providers from "@/components/Providers";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default async function layout({ children }: { children: React.ReactNode }) {
    const session = auth.api.getSession({
        headers: await headers()
    })

    if (!session) {
        redirect("/signin");
    }

    return (
        <Providers>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="max-h-screen">
                    <SidebarTrigger className="-ml-1 m-1 absolute cursor-pointer" />
                    <div className="border p-1 px-2 rounded-lg" style={{ height: "calc(100vh - 16px)" }}>
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </Providers>
    )
}
