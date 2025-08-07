"use client";

import { getUserRepos, getRepoActivity } from "@/lib/github";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  GitBranch,
  Star,
  GitFork,
  Calendar,
} from "lucide-react";
import { StepProps } from "@/app/onboarding/page";
import { GitHubRepo } from "@/types/github";
import { createClient } from "@/lib/supabase/client";

const MAX_SELECTIONS = 3;

interface RepoState {
  repos: GitHubRepo[];
  selectedRepos: number[];
  syncedRepos: Set<number>;
  previouslySelectedRepos: Set<number>;
}

interface LoadingState {
  isLoading: boolean;
  isSaving: boolean;
  syncingRepo: number | null;
  error: string | null;
}

export function RepoSelector({ onComplete, state }: StepProps) {
  const [repoState, setRepoState] = useState<RepoState>({
    repos: [],
    selectedRepos: [],
    syncedRepos: new Set(),
    previouslySelectedRepos: new Set(),
  });

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    isSaving: false,
    syncingRepo: null,
    error: null,
  });

  const isStepCompleted = useMemo(
    () => state.repos_selected && repoState.selectedRepos.length > 0,
    [state.repos_selected, repoState.selectedRepos.length],
  );

  const availableSelections = useMemo(
    () => MAX_SELECTIONS - repoState.selectedRepos.length,
    [repoState.selectedRepos.length],
  );

  const syncRepository = useCallback(
    async (repo: GitHubRepo) => {
      setLoadingState((prev) => ({ ...prev, syncingRepo: repo.id }));

      try {
        const activity = await getRepoActivity(repo);
        if (!activity) {
          throw new Error("No activity data returned from GitHub API");
        }

        const repoData = {
          id: repo.id,
          user_id: state.user_id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description || null,
          is_private: repo.private || false,
          html_url: repo.html_url,
          language: repo.language || null,
          stargazers_count: repo.stargazers_count || 0,
          forks_count: repo.forks_count || 0,
          default_branch: repo.default_branch || "main",
          owner_login: repo.owner?.login || "",
          owner_avatar_url: repo.owner?.avatar_url || "",
          created_at: repo.created_at || new Date().toISOString(),
          updated_at: repo.updated_at || new Date().toISOString(),
          pushed_at: repo.pushed_at || null,
          last_synced_at: new Date().toISOString(),
          activity_data: activity,
        };

        const { error } = await createClient()
          .from("github_repos")
          .upsert(repoData, { onConflict: "id" });

        if (error) throw error;

        setRepoState((prev) => ({
          ...prev,
          syncedRepos: new Set(prev.syncedRepos).add(repo.id),
          repos: prev.repos.map((r) =>
            r.id === repo.id ? { ...r, activity_data: activity } : r,
          ),
        }));

        toast.success(`Synced ${repo.name} successfully`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        toast.error(`Failed to sync ${repo.name}: ${errorMessage}`);
        throw error;
      } finally {
        setLoadingState((prev) => ({ ...prev, syncingRepo: null }));
      }
    },
    [state.user_id],
  );

  const toggleRepo = useCallback(
    (repoId: number) => {
      if (repoState.previouslySelectedRepos.has(repoId)) {
        toast.info(
          "This repository is already synced and cannot be deselected.",
        );
        return;
      }

      setRepoState((prev) => {
        const isCurrentlySelected = prev.selectedRepos.includes(repoId);

        if (isCurrentlySelected) {
          return {
            ...prev,
            selectedRepos: prev.selectedRepos.filter((id) => id !== repoId),
          };
        }

        if (prev.selectedRepos.length >= MAX_SELECTIONS) {
          toast.error(
            `You can only select up to ${MAX_SELECTIONS} repositories.`,
          );
          return prev;
        }

        return {
          ...prev,
          selectedRepos: [...prev.selectedRepos, repoId],
        };
      });
    },
    [repoState.previouslySelectedRepos],
  );

  const fetchPreviouslySelectedRepos = useCallback(async () => {
    try {
      const { data: userRepos, error } = await createClient()
        .from("github_repos")
        .select("id")
        .eq("user_id", state.user_id);

      if (error) throw error;

      const repoIds = userRepos?.map((repo) => repo.id) || [];
      const repoIdSet = new Set(repoIds);

      setRepoState((prev) => ({
        ...prev,
        previouslySelectedRepos: repoIdSet,
        syncedRepos: repoIdSet,
        selectedRepos: repoIds,
      }));
    } catch {
      // Silent fail - previously selected repos are optional
    }
  }, [state.user_id]);

  const fetchRepos = useCallback(async () => {
    if (!state.github_connected) {
      setLoadingState({
        isLoading: false,
        isSaving: false,
        syncingRepo: null,
        error:
          "GitHub is not connected. Please connect your GitHub account first.",
      });
      return;
    }

    try {
      setLoadingState((prev) => ({ ...prev, isLoading: true, error: null }));

      await fetchPreviouslySelectedRepos();
      const fetchedRepos = await getUserRepos();

      if (!fetchedRepos?.length) {
        throw new Error(
          "No repositories found. Please make sure you have access to at least one GitHub repository.",
        );
      }

      setRepoState((prev) => ({ ...prev, repos: fetchedRepos }));
    } catch (err) {
      setLoadingState((prev) => ({
        ...prev,
        error:
          err instanceof Error ? err.message : "Failed to load repositories",
      }));
    } finally {
      setLoadingState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.github_connected, fetchPreviouslySelectedRepos]);

  const handleRetry = useCallback(async () => {
    try {
      const { error: refreshError } =
        await createClient().auth.refreshSession();
      if (refreshError) throw refreshError;
      await fetchRepos();
    } catch {
      setLoadingState((prev) => ({
        ...prev,
        error: "Failed to refresh your session. Please sign in again.",
      }));
    }
  }, [fetchRepos]);

  const saveAndComplete = useCallback(async () => {
    if (repoState.selectedRepos.length === 0) {
      toast.error("Please select at least one repository");
      return;
    }

    try {
      setLoadingState((prev) => ({ ...prev, isSaving: true }));

      const selectedRepoData = repoState.repos.filter((repo) =>
        repoState.selectedRepos.includes(repo.id),
      );

      // Sync unsynced repos in parallel
      const unsyncedRepos = selectedRepoData.filter(
        (repo) => !repoState.syncedRepos.has(repo.id),
      );

      await Promise.all(unsyncedRepos.map((repo) => syncRepository(repo)));

      const { error: onboardingError } = await createClient()
        .from("user_onboarding")
        .upsert(
          {
            user_id: state.user_id,
            repos_selected: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (onboardingError) throw onboardingError;

      toast.success("Repositories saved successfully!");
      setTimeout(onComplete, 1000);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save repositories",
      );
    } finally {
      setLoadingState((prev) => ({ ...prev, isSaving: false }));
    }
  }, [repoState, state.user_id, syncRepository, onComplete]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  if (loadingState.isLoading) {
    return (
      <div className="space-y-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Select Repositories
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Loading your repositories from GitHub...
          </p>
        </div>
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">This might take a moment</p>
        </div>
      </div>
    );
  }

  if (loadingState.error) {
    return (
      <div className="space-y-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Select Repositories
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            We encountered an issue loading your repositories.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
          <div className="flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to load repositories
            </h3>
            <p className="text-muted-foreground">{loadingState.error}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleRetry} variant="outline" size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => (window.location.href = "/onboarding?step=1")}
              size="lg"
            >
              Reconnect GitHub
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (repoState.repos.length === 0) {
    return (
      <div className="space-y-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Select Repositories
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            No repositories found in your GitHub account.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
          <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="max-w-md">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No repositories found
            </h3>
            <p className="text-muted-foreground">
              We couldn&apos;t find any repositories in your GitHub account.
              Make sure you have at least one repository or check your
              permissions.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchRepos} variant="outline" size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={onComplete} size="lg">
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex-shrink-0 max-w-2xl">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isStepCompleted
                ? "Your Selected Repositories"
                : "Select repositories to track"}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              {isStepCompleted
                ? `You can select up to ${MAX_SELECTIONS} repositories to monitor and analyze.`
                : `Choose up to ${MAX_SELECTIONS} repositories to track your contributions and sync their activity data.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="text-sm text-foreground">
              <span className="font-medium">{repoState.repos.length}</span>{" "}
              repositories found
            </div>
            <div className="text-sm text-foreground">
              <span className="font-medium">
                {repoState.selectedRepos.length}
              </span>{" "}
              of {MAX_SELECTIONS} selected
            </div>
            {repoState.previouslySelectedRepos.size > 0 && (
              <div className="text-sm text-green-600">
                <span className="font-medium">
                  {repoState.previouslySelectedRepos.size}
                </span>{" "}
                already synced
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-4">
        <div className="h-full overflow-y-auto pr-2 -mr-2">
          <div className="grid gap-4 pb-4">
            {repoState.repos.map((repo) => {
              const isSelected = repoState.selectedRepos.includes(repo.id);
              const isPreviouslySelected =
                repoState.previouslySelectedRepos.has(repo.id);
              const isSynced = repoState.syncedRepos.has(repo.id);
              const isDisabled =
                isPreviouslySelected ||
                (!isSelected && availableSelections === 0);

              return (
                <div
                  key={repo.id}
                  className={`group p-6 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? isPreviouslySelected
                        ? "border-green-300 bg-green-50/50 shadow-sm"
                        : "border-primary/30 bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:bg-muted/30 hover:border-border/60"
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRepo(repo.id)}
                        disabled={isDisabled}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {repo.name}
                          </h3>

                          <div className="flex items-center space-x-2">
                            {isPreviouslySelected && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Previously Synced
                              </span>
                            )}
                            {isSynced && !isPreviouslySelected && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Synced
                              </span>
                            )}
                            {repo.private && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Private
                              </span>
                            )}
                          </div>
                        </div>

                        {!isPreviouslySelected && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => syncRepository(repo)}
                            disabled={
                              loadingState.syncingRepo === repo.id ||
                              !isSelected
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title={
                              isSelected
                                ? "Sync repository"
                                : "Select repository first"
                            }
                          >
                            {loadingState.syncingRepo === repo.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="mb-4">
                        {repo.description ? (
                          <p className="text-muted-foreground leading-relaxed">
                            {repo.description}
                          </p>
                        ) : (
                          <p className="text-muted-foreground italic">
                            No description available
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {repo.language && (
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full bg-primary/60"></div>
                            <span>{repo.language}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1">
                          <Star className="h-3.5 w-3.5" />
                          <span>{repo.stargazers_count || 0}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <GitFork className="h-3.5 w-3.5" />
                          <span>{repo.forks_count || 0}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            Updated{" "}
                            {new Date(repo.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex justify-between items-center pt-6 border-t border-border">
        <div className="text-sm text-muted-foreground">
          {isStepCompleted
            ? `${repoState.selectedRepos.length} repositories are synced and ready to track`
            : repoState.selectedRepos.length === 0
              ? `Select up to ${MAX_SELECTIONS} repositories to continue`
              : `${repoState.selectedRepos.length} of ${MAX_SELECTIONS} repositories selected`}
        </div>

        <Button
          onClick={isStepCompleted ? onComplete : saveAndComplete}
          disabled={
            !isStepCompleted &&
            (repoState.selectedRepos.length === 0 ||
              loadingState.syncingRepo !== null ||
              loadingState.isSaving)
          }
          size="lg"
          className="px-8"
        >
          {isStepCompleted ? (
            "Continue to Next Step"
          ) : loadingState.syncingRepo ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : loadingState.isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save & Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
