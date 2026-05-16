"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setAllowed(true);
    }

    checkUser();
  }, [router]);

  if (!allowed) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] p-10 text-[#252b2e]">
        Checking login...
      </main>
    );
  }

  return <>{children}</>;
}