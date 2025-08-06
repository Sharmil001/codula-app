"use client";

import { getUserRepos, getRepoActivity } from "@/lib/github";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { StepProps } from "@/app/onboarding/page";
import { supabase } from "@/lib/supabase/client";
import { GitHubRepo } from "@/types/github";

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

        const { error } = await supabase
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
      const { data: userRepos, error } = await supabase
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
      const { error: refreshError } = await supabase.auth.refreshSession();
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

      const { error: onboardingError } = await supabase
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

  // Loading state
  if (loadingState.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your repositories...</p>
      </div>
    );
  }

  // Error state
  if (loadingState.error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg max-w-md">
          <p className="font-medium mb-2">Failed to load repositories</p>
          <p className="text-sm">{loadingState.error}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button onClick={() => (window.location.href = "/onboarding?step=1")}>
            Reconnect GitHub
          </Button>
        </div>
      </div>
    );
  }

  // No repos state
  if (repoState.repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium mb-2">No repositories found</h3>
          <p className="text-muted-foreground mb-4">
            We couldn&apos;t find any repositories in your GitHub account.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={fetchRepos} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onComplete}>Skip for now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {isStepCompleted
            ? "Your Selected Repositories"
            : "Select repositories to track"}
        </h2>
        <p className="text-muted-foreground">
          {isStepCompleted
            ? `You can select up to ${MAX_SELECTIONS} repositories.`
            : `Choose up to ${MAX_SELECTIONS} repositories to track your contributions and sync their activity.`}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Found {repoState.repos.length} repositories •{" "}
          {repoState.selectedRepos.length} of {MAX_SELECTIONS} selected
          {repoState.previouslySelectedRepos.size > 0 && (
            <span className="ml-2 text-green-600">
              • {repoState.previouslySelectedRepos.size} already synced
            </span>
          )}
        </p>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto p-2 border rounded-md">
        {repoState.repos.map((repo) => {
          const isSelected = repoState.selectedRepos.includes(repo.id);
          const isPreviouslySelected = repoState.previouslySelectedRepos.has(
            repo.id,
          );
          const isSynced = repoState.syncedRepos.has(repo.id);
          const isDisabled =
            isPreviouslySelected || (!isSelected && availableSelections === 0);

          return (
            <div
              key={repo.id}
              className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                isSelected
                  ? isPreviouslySelected
                    ? "border-green-300 bg-green-50"
                    : "border-primary/30 bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="mt-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRepo(repo.id)}
                  disabled={isDisabled}
                  className="h-4 w-4 rounded border-gray-300 text-primary disabled:opacity-50"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="font-medium">{repo.name}</span>
                    {isPreviouslySelected && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        Previously Synced
                      </span>
                    )}
                    {isSynced && !isPreviouslySelected && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Synced
                      </span>
                    )}
                  </div>

                  {!isPreviouslySelected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => syncRepository(repo)}
                      disabled={
                        loadingState.syncingRepo === repo.id || !isSelected
                      }
                      className="h-7 w-7"
                      title={
                        isSelected
                          ? "Sync repository"
                          : "Select repository first"
                      }
                    >
                      {loadingState.syncingRepo === repo.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>

                <div className="text-sm text-muted-foreground mt-1">
                  {repo.description ? (
                    <p className="line-clamp-2">{repo.description}</p>
                  ) : (
                    <p className="italic">No description available</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {repo.language && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      {repo.language}
                    </span>
                  )}
                  {repo.private && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      Private
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground self-center">
                    Updated {new Date(repo.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {isStepCompleted
            ? `${repoState.selectedRepos.length} repositories are synced and active`
            : repoState.selectedRepos.length === 0
              ? `Select up to ${MAX_SELECTIONS} repositories to sync`
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
          className="min-w-[140px]"
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
