"use client";

import { useState, useEffect } from "react";
import { StepProps } from "@/app/onboarding/page";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, Twitter, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export function TwitterProfile({
  onComplete,
  state,
  onPrevious,
  isLastStep,
}: StepProps) {
  const [twitterHandle, setTwitterHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExistingHandle = async () => {
      if (!state.user_id) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("user_profiles")
          .select("twitter_handle")
          .eq("user_id", state.user_id)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data?.twitter_handle) {
          setTwitterHandle(data.twitter_handle);
        }
      } catch (err) {
        console.error("Error loading twitter handle:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingHandle();
  }, [state.user_id]);

  const handleTwitterHandleChange = (value: string) => {
    const cleanHandle = value.replace(/^@/, "");
    setTwitterHandle(cleanHandle);
    setError(null);
  };

  const validateTwitterHandle = (handle: string): boolean => {
    if (!handle.trim()) return true;
    const twitterRegex = /^[a-zA-Z0-9_]{1,15}$/;
    return twitterRegex.test(handle);
  };

  const handleContinue = async () => {
    if (!state.user_id) return;

    const trimmedHandle = twitterHandle.trim();

    if (trimmedHandle && !validateTwitterHandle(trimmedHandle)) {
      setError(
        "Please enter a valid Twitter handle (1-15 characters, letters, numbers, and underscores only)",
      );
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: state.user_id,
          twitter_handle: trimmedHandle || null,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      const { error: onboardingError } = await supabase
        .from("user_onboarding")
        .update({
          twitter_added: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", state.user_id);

      if (onboardingError) throw onboardingError;

      toast.success(
        trimmedHandle ? "Twitter profile updated!" : "Twitter step completed!",
      );
      onComplete();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save Twitter profile";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Twitter className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Twitter Profile (Optional)</h2>
        </div>
        <p className="text-muted-foreground">
          Add your Twitter handle to showcase your social presence and connect
          with the community. This step is optional.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="twitter-handle">Twitter Handle (Optional)</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-muted-foreground">@</span>
            </div>
            <Input
              id="twitter-handle"
              type="text"
              placeholder="your_handle"
              value={twitterHandle}
              onChange={(e) => handleTwitterHandleChange(e.target.value)}
              className="pl-8"
              maxLength={15}
              disabled={isSaving}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your Twitter username without the @ symbol, or leave blank to
            skip
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={onPrevious} disabled={isSaving}>
          Previous
        </Button>

        <Button onClick={handleContinue} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isLastStep ? "Complete Setup" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
