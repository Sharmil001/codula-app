"use client";

import { useEffect, useState } from "react";

const supabase = createClient();
import { Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { createClient } from "@/lib/supabase/client";

interface UserData {
  name: string;
  email: string;
  avatar_url?: string;
}

interface UserStats {
  totalRepos: number;
  skills: string[];
  githubProfile: string;
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted || !user) return;

        setUserData({
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Developer",
          email: user.email || "",
          avatar_url: user.user_metadata?.avatar_url,
        });

        await loadUserStats(user.id);

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const loadUserStats = async (userId: string) => {
      try {
        const [reposResult, profileResult] = await Promise.all([
          supabase.from("github_repos").select("id").eq("user_id", userId),
          supabase
            .from("user_profiles")
            .select("skills")
            .eq("user_id", userId)
            .single(),
        ]);

        let allSkills: string[] = [];
        if (
          profileResult.data?.skills &&
          typeof profileResult.data.skills === "object"
        ) {
          allSkills = Object.values(profileResult.data.skills)
            .filter((skillGroup): skillGroup is string[] =>
              Array.isArray(skillGroup),
            )
            .flat()
            .filter((skill): skill is string => typeof skill === "string");
        }

        if (isMounted) {
          setUserStats({
            totalRepos: reposResult.data?.length || 0,
            skills: allSkills,
            githubProfile: "github.com/user",
          });
        }
      } catch (error) {
        console.error("Error loading user stats:", error);
        if (isMounted) {
          setUserStats({
            totalRepos: 0,
            skills: [],
            githubProfile: "github.com/user",
          });
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Loading your dashboard
            </h2>
            <p className="text-muted-foreground">
              Preparing personalized insights...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardLayout userData={userData} userStats={userStats} />;
}
