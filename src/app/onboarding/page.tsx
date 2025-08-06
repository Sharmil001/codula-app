"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check, ContainerIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OnboardingHeader } from "@/components/onboarding/onboarding-header";
import { supabase } from "@/lib/supabase/client";
import { RepoSelector } from "@/components/onboarding/repo-selector";
import { TwitterProfile } from "@/components/onboarding/twitter-handle";
import { Skills } from "@/components/onboarding/skills-questionnaire";
import { OnboardingState } from "@/types/onboarding";

const STEPS = [
  "Connect GitHub",
  "Select Repos",
  "Twitter Profile",
  "Skills",
] as const;
const STEP_FIELDS = [
  "github_connected",
  "repos_selected",
  "twitter_added",
  "skills_added",
] as const;
const REQUIRED_STEPS = [1, 2, 3, 4] as const;

export interface StepProps {
  onComplete: () => void;
  state: OnboardingState;
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
}

function GitHubConnect({ onComplete, onNext, state, isLastStep }: StepProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get("code");
      const provider = searchParams.get("provider");
      const oauthError = searchParams.get("error");

      if (oauthError === "access_denied") {
        setError("GitHub connection was cancelled. Please try again.");
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}?step=1`,
        );
        return;
      }

      if (code && provider === "github") {
        try {
          setIsChecking(true);
          setError(null);

          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}?step=1`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const {
            data: { session },
            error: refreshError,
          } = await supabase.auth.refreshSession();
          if (refreshError || !session?.user)
            throw new Error("Failed to refresh session");

          const { data: currentOnboarding } = await supabase
            .from("user_onboarding")
            .select("completed_steps")
            .eq("user_id", session.user.id)
            .single();

          const existingSteps =
            currentOnboarding?.completed_steps?.map(Number) || [];
          const updatedSteps = existingSteps.includes(1)
            ? existingSteps
            : [...existingSteps, 1];

          await supabase.from("user_onboarding").upsert({
            user_id: session.user.id,
            github_connected: true,
            completed_steps: updatedSteps.map(String),
            updated_at: new Date().toISOString(),
          });

          toast.success("GitHub connected successfully!");
          onComplete();
        } catch {
          setError("Failed to complete GitHub connection. Please try again.");
        } finally {
          setIsChecking(false);
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, onComplete]);

  const connectGitHub = async () => {
    if (retryCount >= 3) {
      setError("Too many attempts. Please refresh the page and try again.");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/onboarding?step=${searchParams.get("step") || "1"}`,
          scopes: "repo,user",
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect GitHub");
      setRetryCount((prev) => prev + 1);
      toast.error("Failed to connect GitHub");
    } finally {
      setIsConnecting(false);
    }
  };

  const isProcessing = isConnecting || isChecking;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center p-8 space-y-6 max-w-md mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Connect Your GitHub Account</h2>
          <p className="text-muted-foreground">
            Connect your GitHub account to import your repositories and track
            your contributions.
          </p>
        </div>

        <div className="w-full">
          {state.github_connected ? (
            <div className="flex flex-col items-center space-y-4 p-6 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">GitHub Connected</span>
              </div>
              <p className="text-sm text-green-700 text-center">
                Your GitHub account has been successfully connected.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={connectGitHub}
                disabled={isProcessing}
                className="w-full flex items-center justify-center space-x-2 py-6"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ContainerIcon className="h-5 w-5" />
                )}
                <span className="font-medium">
                  {isChecking
                    ? "Processing connection..."
                    : isConnecting
                      ? "Connecting to GitHub..."
                      : "Connect with GitHub"}
                </span>
              </Button>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md text-center">
                  {error}
                  {retryCount > 0 && ` (Attempt ${retryCount}/3)`}
                </div>
              )}

              <div className="text-sm text-muted-foreground text-center">
                We&apos;ll need access to your public repositories to analyze
                your contributions.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-border max-w-md mx-auto">
        <div />
        <Button
          onClick={isLastStep ? onComplete : onNext}
          disabled={!state.github_connected}
          variant={state.github_connected ? "default" : "outline"}
        >
          {isLastStep
            ? "Complete Setup"
            : state.github_connected
              ? "Continue to Repository Selection"
              : "Next"}
        </Button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentStep = parseInt(searchParams.get("step") || "1", 10);

  const stepComponents = useMemo(
    () => ({
      1: GitHubConnect,
      2: RepoSelector,
      3: TwitterProfile,
      4: Skills,
    }),
    [],
  );

  const isOnboardingComplete = (onboardingState: OnboardingState): boolean => {
    const completedSteps = new Set(onboardingState.completed_steps || []);
    const allStepsCompleted = REQUIRED_STEPS.every((step) =>
      completedSteps.has(step),
    );

    return (
      allStepsCompleted &&
      onboardingState.github_connected &&
      onboardingState.repos_selected &&
      onboardingState.twitter_added &&
      onboardingState.skills_added
    );
  };

  const navigate = (step: number) => {
    if (state && isOnboardingComplete(state)) {
      router.push("/");
      return;
    }
    router.push(`/onboarding?step=${step}`, { scroll: false });
  };

  const fetchOnboardingState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setState({
          user_id: "",
          github_connected: false,
          repos_selected: false,
          twitter_added: false,
          skills_added: false,
          completed_steps: [],
        });
        return;
      }

      const isGitHubUser =
        user.app_metadata?.providers?.includes("github") ||
        user.identities?.some((identity) => identity.provider === "github");

      const { data: onboardingData, error: onboardingError } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .single();

      let finalOnboardingData = onboardingData;

      if (onboardingError?.code === "PGRST116") {
        const initialData = {
          user_id: user.id,
          github_connected: isGitHubUser,
          repos_selected: false,
          twitter_added: false,
          skills_added: false,
          completed_steps: isGitHubUser ? ["1"] : [],
        };

        const { data: newData, error: createError } = await supabase
          .from("user_onboarding")
          .insert(initialData)
          .select()
          .single();

        if (createError) throw createError;
        finalOnboardingData = newData;
      } else if (onboardingError) {
        throw onboardingError;
      }

      // Verify repos exist
      const { data: userRepos } = await supabase
        .from("github_repos")
        .select("id")
        .eq("user_id", user.id);

      const hasSelectedRepos = userRepos && userRepos.length > 0;
      const actualReposSelected =
        finalOnboardingData?.repos_selected && hasSelectedRepos;
      const githubConnected =
        isGitHubUser || finalOnboardingData?.github_connected || false;

      let finalCompletedSteps =
        finalOnboardingData?.completed_steps?.map(Number) ?? [];
      const stepFieldMapping = [
        { step: 1, field: githubConnected },
        { step: 2, field: actualReposSelected },
        { step: 3, field: finalOnboardingData?.twitter_added },
        { step: 4, field: finalOnboardingData?.skills_added },
      ];

      let needsUpdate = false;
      for (const { step, field } of stepFieldMapping) {
        if (field && !finalCompletedSteps.includes(step)) {
          finalCompletedSteps = [...finalCompletedSteps, step].sort();
          needsUpdate = true;
        }
      }

      if (
        needsUpdate ||
        actualReposSelected !== finalOnboardingData?.repos_selected
      ) {
        await supabase
          .from("user_onboarding")
          .update({
            github_connected: githubConnected,
            repos_selected: actualReposSelected,
            completed_steps: finalCompletedSteps.map(String),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }

      const finalState = {
        user_id: user.id,
        github_connected: githubConnected,
        repos_selected: actualReposSelected,
        twitter_added: finalOnboardingData?.twitter_added ?? false,
        skills_added: finalOnboardingData?.skills_added ?? false,
        completed_steps: finalCompletedSteps,
      };

      setState(finalState);

      if (isOnboardingComplete(finalState)) {
        router.push("/");
        return;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load onboarding state",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleStepComplete = async () => {
    if (!state) {
      toast.error("State not loaded. Please refresh the page.");
      return;
    }

    try {
      const isLastStep = currentStep === STEPS.length;
      const currentStepField = STEP_FIELDS[currentStep - 1];
      const updatedCompletedSteps = [...(state.completed_steps || [])];

      if (!updatedCompletedSteps.includes(currentStep)) {
        updatedCompletedSteps.push(currentStep);
      }

      // Verify repos for step 2
      if (currentStep === 2) {
        const { data: userRepos, error: repoError } = await supabase
          .from("github_repos")
          .select("id")
          .eq("user_id", state.user_id);

        if (repoError) {
          throw new Error(
            `Repository verification failed: ${repoError.message}`,
          );
        }

        if (!userRepos || userRepos.length === 0) {
          toast.error(
            "No repositories were saved. Please select at least one repository.",
          );
          return;
        }
      }

      const updateData = {
        [currentStepField]: true,
        completed_steps: updatedCompletedSteps.map(String),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("user_onboarding")
        .update(updateData)
        .eq("user_id", state.user_id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      const newState = {
        ...state,
        [currentStepField]: true,
        completed_steps: updatedCompletedSteps,
      };

      setState(newState);

      if (isLastStep) {
        toast.success("🎉 Onboarding completed successfully!");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        navigate(currentStep + 1);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error && err.message
          ? err.message
          : "Failed to complete step. Please try again.";

      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    fetchOnboardingState();
  }, [fetchOnboardingState]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {error || "Failed to load onboarding"}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (isOnboardingComplete(state)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const StepComponent =
    stepComponents[currentStep as keyof typeof stepComponents];
  const isLastStep = currentStep === STEPS.length;
  const maxAllowedStep = Math.min(
    STEPS.length,
    Math.max(currentStep, state.completed_steps.length + 1),
  );

  const stepProps = {
    onComplete: handleStepComplete,
    onNext: () => navigate(currentStep + 1),
    onPrevious: () => navigate(currentStep - 1),
    state,
    isLastStep,
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingHeader
        currentStep={currentStep}
        maxAllowedStep={maxAllowedStep}
        completedSteps={state.completed_steps}
        onStepClick={(step) => {
          if (step <= maxAllowedStep && !isOnboardingComplete(state)) {
            navigate(step);
          }
        }}
      />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {StepComponent && <StepComponent {...stepProps} />}
      </div>
    </div>
  );
}
