"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

interface OnboardingData {
  github_connected: boolean;
  repos_selected: boolean;
  twitter_added: boolean;
  skills_added: boolean;
  completed_steps: string[];
}

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

const REQUIRED_STEPS = [1, 2, 3, 4] as const;

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkOnboardingStatus = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (!user) {
          router.push("/onboarding?step=1");
          return;
        }

        // Set user data
        setUserData({
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Developer",
          email: user.email || "",
          avatar_url: user.user_metadata?.avatar_url,
        });

        const { data: onboardingData } = await supabase
          .from("user_onboarding")
          .select(
            "github_connected, repos_selected, twitter_added, skills_added, completed_steps",
          )
          .eq("user_id", user.id)
          .single();

        if (!isMounted) return;

        if (!onboardingData) {
          router.push("/onboarding?step=1");
          return;
        }

        const completedSteps = new Set(
          (onboardingData.completed_steps || []).map(Number),
        );
        const allStepsCompleted = REQUIRED_STEPS.every((step) =>
          completedSteps.has(step),
        );

        const requiredFieldsComplete =
          onboardingData.github_connected &&
          onboardingData.repos_selected &&
          onboardingData.twitter_added &&
          onboardingData.skills_added;

        // Verify repos exist if marked as selected
        if (onboardingData.repos_selected) {
          const { data: userRepos } = await supabase
            .from("github_repos")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (!userRepos?.length) {
            await supabase
              .from("user_onboarding")
              .update({
                repos_selected: false,
                completed_steps:
                  onboardingData.completed_steps?.filter(
                    (step: string) => step !== "2",
                  ) || [],
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id);

            if (isMounted) router.push("/onboarding?step=2");
            return;
          }
        }

        if (!isMounted) return;

        if (requiredFieldsComplete && allStepsCompleted) {
          // Load user stats
          await loadUserStats(user.id);
          setIsLoading(false);
          return;
        }

        // Find next incomplete step
        const nextStep =
          REQUIRED_STEPS.find(
            (step) =>
              !completedSteps.has(step) ||
              !getFieldForStep(step, onboardingData),
          ) || 1;

        router.push(`/onboarding?step=${nextStep}`);
      } catch {
        if (isMounted) router.push("/onboarding?step=1");
      }
    };

    const loadUserStats = async (userId: string) => {
      try {
        // Load user repositories and profile data
        const [reposResult, profileResult] = await Promise.all([
          supabase.from("github_repos").select("id").eq("user_id", userId),
          supabase
            .from("user_profiles")
            .select("skills")
            .eq("user_id", userId)
            .single(),
        ]);

        // Safely extract skills with proper typing
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

        setUserStats({
          totalRepos: reposResult.data?.length || 0,
          skills: allSkills,
          githubProfile: "github.com/user", // This would be actual profile
        });
      } catch (error) {
        console.error("Error loading user stats:", error);
        // Set default stats on error
        setUserStats({
          totalRepos: 0,
          skills: [],
          githubProfile: "github.com/user",
        });
      }
    };

    checkOnboardingStatus();

    return () => {
      isMounted = false;
    };
  }, [router]);

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

function getFieldForStep(step: number, data: OnboardingData): boolean {
  switch (step) {
    case 1:
      return data.github_connected;
    case 2:
      return data.repos_selected;
    case 3:
      return data.twitter_added;
    case 4:
      return data.skills_added;
    default:
      return false;
  }
}
