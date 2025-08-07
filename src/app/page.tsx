'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface OnboardingData {
  github_connected: boolean;
  repos_selected: boolean;
  twitter_added: boolean;
  skills_added: boolean;
  completed_steps: string[];
}

const REQUIRED_STEPS = [1, 2, 3, 4] as const;

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!isMounted) return;
        
        if (!user) {
          router.push('/onboarding?step=1');
          return;
        }

        const { data: onboardingData } = await supabase
          .from('user_onboarding')
          .select('github_connected, repos_selected, twitter_added, skills_added, completed_steps')
          .eq('user_id', user.id)
          .single();

        if (!isMounted) return;

        if (!onboardingData) {
          router.push('/onboarding?step=1');
          return;
        }

        const completedSteps = new Set((onboardingData.completed_steps || []).map(Number));
        const allStepsCompleted = REQUIRED_STEPS.every(step => completedSteps.has(step));
        
        const requiredFieldsComplete = 
          onboardingData.github_connected &&
          onboardingData.repos_selected &&
          onboardingData.twitter_added &&
          onboardingData.skills_added;

        // Verify repos exist if marked as selected
        if (onboardingData.repos_selected) {
          const { data: userRepos } = await supabase
            .from('github_repos')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

          if (!userRepos?.length) {
            await supabase
              .from('user_onboarding')
              .update({ 
                repos_selected: false,
                completed_steps: onboardingData.completed_steps?.filter((step: string) => step !== '2') || [],
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);
            
            if (isMounted) router.push('/onboarding?step=2');
            return;
          }
        }

        if (!isMounted) return;

        if (requiredFieldsComplete && allStepsCompleted) {
          setIsLoading(false);
          return;
        }

        // Find next incomplete step
        const nextStep = REQUIRED_STEPS.find(step => 
          !completedSteps.has(step) || 
          !getFieldForStep(step, onboardingData)
        ) || 1;

        router.push(`/onboarding?step=${nextStep}`);

      } catch (error) {
        if (isMounted) router.push('/onboarding?step=1');
      }
    };

    checkOnboardingStatus();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Hello Codula</h1>
        <p className="text-xl text-muted-foreground mb-8">Welcome to your dashboard!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">🔗 GitHub Integration</h2>
            <p className="text-muted-foreground">Your repositories are synced and ready.</p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">👤 Profile Complete</h2>
            <p className="text-muted-foreground">All your information has been configured.</p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">🚀 Ready to Code</h2>
            <p className="text-muted-foreground">Start exploring your coding journey.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFieldForStep(step: number, data: OnboardingData): boolean {
  switch (step) {
    case 1: return data.github_connected;
    case 2: return data.repos_selected;
    case 3: return data.twitter_added;
    case 4: return data.skills_added;
    default: return false;
  }
}