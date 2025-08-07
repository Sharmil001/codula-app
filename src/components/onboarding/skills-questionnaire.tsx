"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { StepProps } from "@/app/onboarding/page";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Loader2, Code, Plus, X, Lightbulb, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { POPULAR_SKILLS, SKILL_CATEGORIES } from "@/lib/utils";

type SkillCategory = keyof typeof SKILL_CATEGORIES | "other_skills";

interface SkillsData {
  programming_languages: string[];
  frameworks: string[];
  databases: string[];
  cloud_platforms: string[];
  other_skills: string[];
}

interface SkillsState {
  skills: SkillsData;
  customSkill: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const INITIAL_SKILLS: SkillsData = {
  programming_languages: [],
  frameworks: [],
  databases: [],
  cloud_platforms: [],
  other_skills: [],
};

const CATEGORY_ICONS = {
  programming_languages: "💻",
  frameworks: "⚛️",
  databases: "🗄️",
  cloud_platforms: "☁️",
  other_skills: "🛠️",
};

const CATEGORY_NAMES = {
  programming_languages: "Programming Languages",
  frameworks: "Frameworks & Libraries",
  databases: "Databases",
  cloud_platforms: "Cloud Platforms",
  other_skills: "Other Skills",
};

export function Skills({ onComplete, state, onPrevious }: StepProps) {
  const [skillsState, setSkillsState] = useState<SkillsState>({
    skills: INITIAL_SKILLS,
    customSkill: "",
    isLoading: false,
    isSaving: false,
    error: null,
  });

  const allSkills = useMemo(
    () => Object.values(skillsState.skills).flat(),
    [skillsState.skills],
  );

  const availablePopularSkills = useMemo(
    () =>
      POPULAR_SKILLS.filter(
        (skill) =>
          !allSkills.some((s) => s.toLowerCase() === skill.toLowerCase()),
      ).slice(0, 15),
    [allSkills],
  );

  const categorizeSkill = useCallback((skill: string): SkillCategory => {
    const skillLower = skill.toLowerCase();

    for (const [category, categorySkills] of Object.entries(SKILL_CATEGORIES)) {
      if ((categorySkills as readonly string[]).includes(skillLower)) {
        return category as keyof typeof SKILL_CATEGORIES;
      }
    }
    return "other_skills";
  }, []);

  const addSkill = useCallback(
    (skillToAdd: string) => {
      const skill = skillToAdd.trim();
      if (!skill) return;

      if (allSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
        toast.error("Skill already added");
        return;
      }

      const category = categorizeSkill(skill);
      setSkillsState((prev) => ({
        ...prev,
        skills: {
          ...prev.skills,
          [category]: [...prev.skills[category], skill],
        },
        customSkill: "",
        error: null,
      }));

      toast.success(`Added ${skill} to your skills`);
    },
    [allSkills, categorizeSkill],
  );

  const removeSkill = useCallback((skillToRemove: string) => {
    setSkillsState((prev) => ({
      ...prev,
      skills: Object.fromEntries(
        Object.entries(prev.skills).map(([category, categorySkills]) => [
          category,
          categorySkills.filter((s: string) => s !== skillToRemove),
        ]),
      ) as SkillsData,
    }));
  }, []);

  const handleCustomSkillSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      addSkill(skillsState.customSkill);
    },
    [addSkill, skillsState.customSkill],
  );

  const handleComplete = useCallback(async () => {
    if (allSkills.length === 0) {
      setSkillsState((prev) => ({
        ...prev,
        error: "Please add at least one skill to continue",
      }));
      return;
    }

    setSkillsState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      const [profileResult, onboardingResult] = await Promise.all([
        supabase.from("user_profiles").upsert({
          user_id: state.user_id,
          skills: skillsState.skills,
          updated_at: new Date().toISOString(),
        }),
        supabase
          .from("user_onboarding")
          .update({
            skills_added: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", state.user_id),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (onboardingResult.error) throw onboardingResult.error;

      toast.success("Skills saved successfully!");
      onComplete();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save skills";
      setSkillsState((prev) => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage);
    } finally {
      setSkillsState((prev) => ({ ...prev, isSaving: false }));
    }
  }, [allSkills, skillsState.skills, state.user_id, onComplete]);

  const loadExistingSkills = useCallback(async () => {
    if (!state.user_id) return;

    setSkillsState((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("skills")
        .eq("user_id", state.user_id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data?.skills) {
        setSkillsState((prev) => ({
          ...prev,
          skills: {
            programming_languages: data.skills.programming_languages || [],
            frameworks: data.skills.frameworks || [],
            databases: data.skills.databases || [],
            cloud_platforms: data.skills.cloud_platforms || [],
            other_skills: data.skills.other_skills || [],
          },
        }));
      }
    } catch {
      // Silent fail - existing skills are optional
    } finally {
      setSkillsState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.user_id]);

  useEffect(() => {
    loadExistingSkills();
  }, [loadExistingSkills]);

  if (skillsState.isLoading) {
    return (
      <div className="space-y-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Add Your Skills
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Loading your existing skills...
          </p>
        </div>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const skillCategories = (
    Object.entries(skillsState.skills) as [keyof SkillsData, string[]][]
  ).filter(([, categorySkills]) => categorySkills.length > 0);

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
              <Code className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Add Your Skills
              </h1>
              <p className="text-lg text-muted-foreground">
                Tell us about your technical skills and expertise. This helps us
                personalize your experience.
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center space-x-2 text-sm text-foreground">
              <Zap className="h-4 w-4 text-primary" />
              <span>
                <span className="font-medium">{allSkills.length}</span> skill
                {allSkills.length !== 1 ? "s" : ""} added
                {allSkills.length === 0 &&
                  " - Please add at least one skill to continue"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Skills Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold text-foreground">
            Popular Skills
          </h2>
          <span className="text-sm text-muted-foreground">Click to add</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {availablePopularSkills.map((skill) => (
            <Button
              key={skill}
              variant="outline"
              size="sm"
              className="justify-start h-auto py-2 px-3 text-left hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => addSkill(skill)}
            >
              <Plus className="h-3 w-3 mr-2 flex-shrink-0" />
              <span className="truncate">{skill}</span>
            </Button>
          ))}
        </div>

        {availablePopularSkills.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            All popular skills have been added! Add custom skills below.
          </p>
        )}
      </div>

      {/* Custom Skill Input */}
      <div className="space-y-3">
        <Label
          htmlFor="custom-skill"
          className="text-lg font-semibold text-foreground"
        >
          Add Custom Skill
        </Label>
        <form onSubmit={handleCustomSkillSubmit} className="flex space-x-3">
          <div className="flex-1">
            <Input
              id="custom-skill"
              type="text"
              placeholder="e.g., React Native, TensorFlow, GraphQL, etc."
              value={skillsState.customSkill}
              onChange={(e) =>
                setSkillsState((prev) => ({
                  ...prev,
                  customSkill: e.target.value,
                }))
              }
              disabled={skillsState.isSaving}
              className="h-12 text-base"
            />
          </div>
          <Button
            type="submit"
            disabled={!skillsState.customSkill.trim() || skillsState.isSaving}
            size="lg"
            className="px-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </form>
      </div>

      {/* Skills Categories */}
      {skillCategories.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground">Your Skills</h2>

          <div className="grid gap-6">
            {skillCategories.map(([category, categorySkills]) => {
              const categoryName = CATEGORY_NAMES[category];
              const categoryIcon = CATEGORY_ICONS[category];

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{categoryIcon}</span>
                    <h3 className="text-lg font-medium text-foreground">
                      {categoryName}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      ({categorySkills.length} skill
                      {categorySkills.length !== 1 ? "s" : ""})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {categorySkills.map((skill: string) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="flex items-center space-x-2 py-1.5 px-3 text-sm hover:bg-destructive/10 group transition-colors"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={skillsState.isSaving}
                          title={`Remove ${skill}`}
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Display */}
      {skillsState.error && (
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-destructive text-xl">⚠️</div>
            <div>
              <p className="font-medium text-destructive">
                Unable to save skills
              </p>
              <p className="text-sm text-destructive/80 mt-1">
                {skillsState.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-8 border-t border-border">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={skillsState.isSaving}
          size="lg"
          className="px-8"
        >
          Previous
        </Button>

        <Button
          onClick={handleComplete}
          disabled={allSkills.length === 0 || skillsState.isSaving}
          size="lg"
          className="px-8"
        >
          {skillsState.isSaving && (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          )}
          Complete Setup
        </Button>
      </div>
    </div>
  );
}
