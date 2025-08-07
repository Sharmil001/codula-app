import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface OnboardingData {
  github_connected: boolean;
  repos_selected: boolean;
  twitter_added: boolean;
  skills_added: boolean;
  completed_steps: string[];
}

const REQUIRED_STEPS = [1, 2, 3, 4] as const;
const AUTH_PATHS = ["/auth", "/login", "/signup"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { pathname } = request.nextUrl;

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (
      !AUTH_PATHS.some((path) => pathname.startsWith(path)) &&
      !pathname.startsWith("/onboarding")
    ) {
      return NextResponse.redirect(new URL("/onboarding?step=1", request.url));
    }
    return supabaseResponse;
  }

  const { data: onboardingData, error: onboardingError } = await supabase
    .from("user_onboarding")
    .select(
      "github_connected, repos_selected, twitter_added, skills_added, completed_steps",
    )
    .eq("user_id", user.id)
    .single();

  if (onboardingError && onboardingError.code !== "PGRST116") {
    return supabaseResponse;
  }

  if (!onboardingData) {
    if (!pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding?step=1", request.url));
    }
    return supabaseResponse;
  }

  const completedSteps = new Set(
    (onboardingData.completed_steps || []).map((step: string) => {
      const num = Number(step);
      return num;
    }),
  );

  const allStepsCompleted = REQUIRED_STEPS.every((step) => {
    const hasStep = completedSteps.has(step);
    return hasStep;
  });

  const requiredFieldsComplete =
    onboardingData.github_connected &&
    onboardingData.repos_selected &&
    onboardingData.twitter_added &&
    onboardingData.skills_added;

  let isOnboardingComplete = requiredFieldsComplete && allStepsCompleted;

  if (isOnboardingComplete && onboardingData.repos_selected) {
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

      isOnboardingComplete = false;
    }
  }

  if (!isOnboardingComplete) {
    if (!pathname.startsWith("/onboarding")) {
      const nextStep =
        REQUIRED_STEPS.find(
          (step) =>
            !completedSteps.has(step) || !getFieldForStep(step, onboardingData),
        ) || 1;

      return NextResponse.redirect(
        new URL(`/onboarding?step=${nextStep}`, request.url),
      );
    }
    return supabaseResponse;
  }

  if (isOnboardingComplete && pathname.startsWith("/onboarding")) {
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

function getFieldForStep(step: number, data: OnboardingData): boolean {
  const result = (() => {
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
  })();

  return result;
}
