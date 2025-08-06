'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { StepProps } from "@/app/onboarding/page";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Loader2, Code, Plus, X, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

const POPULAR_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
  'React', 'Vue.js', 'Angular', 'Node.js', 'Next.js', 'Express',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Git', 'Linux', 'Machine Learning', 'Data Science', 'DevOps'
] as const;

const SKILL_CATEGORIES = {
  programming_languages: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'],
  frameworks: ['react', 'vue.js', 'angular', 'node.js', 'next.js', 'express', 'django', 'flask', 'spring', 'laravel'],
  databases: ['postgresql', 'mysql', 'mongodb', 'redis', 'sqlite', 'elasticsearch', 'cassandra'],
  cloud_platforms: ['aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify', 'digitalocean']
} as const;

type SkillCategory = keyof typeof SKILL_CATEGORIES | 'other_skills';

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
  other_skills: []
};

export function Skills({ onComplete, state, onPrevious }: StepProps) {
  const [skillsState, setSkillsState] = useState<SkillsState>({
    skills: INITIAL_SKILLS,
    customSkill: '',
    isLoading: false,
    isSaving: false,
    error: null
  });

  const allSkills = useMemo(() => 
    Object.values(skillsState.skills).flat(),
    [skillsState.skills]
  );

  const availablePopularSkills = useMemo(() => 
    POPULAR_SKILLS.filter(skill => 
      !allSkills.some(s => s.toLowerCase() === skill.toLowerCase())
    ).slice(0, 15),
    [allSkills]
  );

  const categorizeSkill = useCallback((skill: string): SkillCategory => {
    const skillLower = skill.toLowerCase();
    
    for (const [category, categorySkills] of Object.entries(SKILL_CATEGORIES)) {
      if ((categorySkills as readonly string[]).includes(skillLower)) {
        return category as keyof typeof SKILL_CATEGORIES;
      }
    }
    return 'other_skills';
  }, []);

  const addSkill = useCallback((skillToAdd: string) => {
    const skill = skillToAdd.trim();
    if (!skill) return;

    if (allSkills.some(s => s.toLowerCase() === skill.toLowerCase())) {
      toast.error('Skill already added');
      return;
    }

    const category = categorizeSkill(skill);
    setSkillsState(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: [...prev.skills[category], skill]
      },
      customSkill: '',
      error: null
    }));
  }, [allSkills, categorizeSkill]);

  const removeSkill = useCallback((skillToRemove: string) => {
    setSkillsState(prev => ({
      ...prev,
      skills: Object.fromEntries(
        Object.entries(prev.skills).map(([category, categorySkills]) => [
          category,
          categorySkills.filter((s: string) => s !== skillToRemove)
        ])
      ) as SkillsData
    }));
  }, []);

  const handleCustomSkillSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    addSkill(skillsState.customSkill);
  }, [addSkill, skillsState.customSkill]);

  const handleComplete = useCallback(async () => {
    if (allSkills.length === 0) {
      setSkillsState(prev => ({ ...prev, error: 'Please add at least one skill to continue' }));
      return;
    }

    setSkillsState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const [profileResult, onboardingResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .upsert({
            user_id: state.user_id,
            skills: skillsState.skills,
            updated_at: new Date().toISOString()
          }),
        supabase
          .from('user_onboarding')
          .update({
            skills_added: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', state.user_id)
      ]);

      if (profileResult.error) throw profileResult.error;
      if (onboardingResult.error) throw onboardingResult.error;

      toast.success('Skills saved successfully!');
      onComplete();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save skills';
      setSkillsState(prev => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage);
    } finally {
      setSkillsState(prev => ({ ...prev, isSaving: false }));
    }
  }, [allSkills, skillsState.skills, state.user_id, onComplete]);

  const loadExistingSkills = useCallback(async () => {
    if (!state.user_id) return;

    setSkillsState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('skills')
        .eq('user_id', state.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.skills) {
        setSkillsState(prev => ({
          ...prev,
          skills: {
            programming_languages: data.skills.programming_languages || [],
            frameworks: data.skills.frameworks || [],
            databases: data.skills.databases || [],
            cloud_platforms: data.skills.cloud_platforms || [],
            other_skills: data.skills.other_skills || []
          }
        }));
      }
    } catch (err) {
      // Silent fail - existing skills are optional
    } finally {
      setSkillsState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.user_id]);

  useEffect(() => {
    loadExistingSkills();
  }, [loadExistingSkills]);

  if (skillsState.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const skillCategories = (Object.entries(skillsState.skills) as [keyof SkillsData, string[]][])
    .filter(([, categorySkills]) => categorySkills.length > 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Code className="h-6 w-6 text-purple-500" />
          <h2 className="text-2xl font-bold">Add Your Skills</h2>
        </div>
        <p className="text-muted-foreground">
          Tell us about your technical skills and interests. This step is required to personalize your experience.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <Label className="text-sm font-medium">Popular Skills (Click to add)</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          {availablePopularSkills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => addSkill(skill)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom-skill">Add Custom Skill</Label>
        <form onSubmit={handleCustomSkillSubmit} className="flex space-x-2">
          <Input
            id="custom-skill"
            type="text"
            placeholder="e.g., React Native, TensorFlow, etc."
            value={skillsState.customSkill}
            onChange={(e) => setSkillsState(prev => ({ ...prev, customSkill: e.target.value }))}
            disabled={skillsState.isSaving}
          />
          <Button 
            type="submit" 
            variant="outline" 
            disabled={!skillsState.customSkill.trim() || skillsState.isSaving}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {skillCategories.map(([category, categorySkills]) => {
        const categoryName = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        return (
          <div key={category} className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">{categoryName}</Label>
            <div className="flex flex-wrap gap-2">
              {categorySkills.map((skill: string) => (
                <Badge key={skill} variant="secondary" className="flex items-center space-x-1">
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    disabled={skillsState.isSaving}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        );
      })}

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {allSkills.length} skill{allSkills.length !== 1 ? 's' : ''} added
          {allSkills.length === 0 && ' - Please add at least one skill'}
        </p>
      </div>

      {skillsState.error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md text-center">
          {skillsState.error}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={skillsState.isSaving}
        >
          Previous
        </Button>
        
        <Button
          onClick={handleComplete}
          disabled={allSkills.length === 0 || skillsState.isSaving}
        >
          {skillsState.isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Complete Setup
        </Button>
      </div>
    </div>
  );
}