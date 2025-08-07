"use client";

import { useState, useEffect } from "react";
import { StepProps } from "@/app/onboarding/page";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2, Twitter, AlertCircle, User, AtSign } from "lucide-react";
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
      <div className="space-y-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Twitter Profile
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Loading your profile information...
          </p>
        </div>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
              <Twitter className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Twitter Profile
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                  Optional
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Add your Twitter handle to showcase your social presence and
                connect with the community.
              </p>
            </div>
          </div>

          <div className="p-6 bg-blue-50/50 border border-blue-200/50 rounded-xl">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Why add your Twitter?
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Showcase your professional presence</li>
                  <li>• Connect with other developers in the community</li>
                  <li>• Share your coding journey and insights</li>
                  <li>• Build your personal brand in tech</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg space-y-6">
        <div className="space-y-3">
          <Label
            htmlFor="twitter-handle"
            className="text-lg font-semibold text-foreground"
          >
            Twitter Handle
          </Label>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <AtSign className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              id="twitter-handle"
              type="text"
              placeholder="your_username"
              value={twitterHandle}
              onChange={(e) => handleTwitterHandleChange(e.target.value)}
              className="pl-12 h-12 text-base"
              maxLength={15}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter your Twitter username without the @ symbol. You can always
              add this later if you prefer to skip for now.
            </p>

            {twitterHandle && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Preview:</span>
                <span className="font-medium text-foreground">
                  twitter.com/{twitterHandle}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Invalid Twitter handle
                </p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 bg-muted/30 border border-border rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-lg">💡</div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Don&apos;t have Twitter or prefer to skip?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                No problem! This step is completely optional. You can always add
                your Twitter handle later in your profile settings.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-border">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isSaving}
          size="lg"
          className="px-8"
        >
          Previous
        </Button>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleContinue}
            disabled={isSaving}
            size="lg"
            className="px-6"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Skip for now
          </Button>

          <Button
            onClick={handleContinue}
            disabled={isSaving}
            size="lg"
            className="px-8"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isLastStep ? "Complete Setup" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
