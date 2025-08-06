'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';

type Step = {
  number: number;
  name: string;
  required: boolean;
};

type OnboardingHeaderProps = {
  currentStep: number;
  maxAllowedStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
};

const steps: Step[] = [
  { number: 1, name: 'Connect GitHub', required: true },
  { number: 2, name: 'Select Repos', required: true },
  { number: 3, name: 'Twitter Profile', required: false },
  { number: 4, name: 'Skills', required: true },
];

export function OnboardingHeader({ 
  currentStep, 
  maxAllowedStep, 
  completedSteps, 
  onStepClick 
}: OnboardingHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const allStepsCompleted = completedSteps.length === 4 && 
    [1, 2, 3, 4].every(step => completedSteps.includes(step));

  if (!pathname.startsWith('/onboarding')) return null;

  if (allStepsCompleted) {
    return null;
  }

  const isStepAccessible = (stepNumber: number) => {
    return stepNumber <= maxAllowedStep;
  };

  const isStepCompleted = (stepNumber: number) => {
    return completedSteps.includes(stepNumber);
  };

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="text-lg font-semibold">
              Codula
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <div className="hidden sm:block">
              <div className="flex items-center space-x-4">
                {steps.map((step, index) => (
                  <React.Fragment key={step.number}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isStepAccessible(step.number) && !allStepsCompleted) {
                          onStepClick(step.number);
                        }
                      }}
                      disabled={!isStepAccessible(step.number) || allStepsCompleted}
                      className={`flex items-center ${
                        !isStepAccessible(step.number) || allStepsCompleted
                          ? 'cursor-not-allowed opacity-50' 
                          : 'cursor-pointer hover:opacity-80'
                      }`}
                      title={
                        allStepsCompleted 
                          ? 'Onboarding complete - redirecting to dashboard'
                          : !isStepAccessible(step.number) 
                          ? 'Complete previous steps first' 
                          : step.name
                      }
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full mr-2 text-xs font-medium relative',
                          currentStep === step.number
                            ? 'bg-primary text-primary-foreground'
                            : isStepCompleted(step.number)
                            ? 'bg-green-500 text-white'
                            : isStepAccessible(step.number)
                            ? 'bg-muted text-muted-foreground border-2 border-primary/20'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isStepCompleted(step.number) ? (
                          <Check className="h-3 w-3" />
                        ) : !isStepAccessible(step.number) ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          step.number
                        )}
                      </span>
                      <span className="hidden sm:inline items-center">
                        {step.name}
                        {!step.required && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (optional)
                          </span>
                        )}
                      </span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "mx-2 h-0.5 w-6",
                        isStepCompleted(step.number) 
                          ? "bg-green-500" 
                          : currentStep > step.number 
                          ? "bg-primary/50" 
                          : "bg-border"
                      )} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            <div className="sm:hidden">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep} of {steps.length}
                </span>
                <div className="flex space-x-1">
                  {steps.map((step) => (
                    <div
                      key={step.number}
                      className={cn(
                        'h-2 w-2 rounded-full',
                        currentStep === step.number
                          ? 'bg-primary'
                          : isStepCompleted(step.number)
                          ? 'bg-green-500'
                          : isStepAccessible(step.number)
                          ? 'bg-primary/30'
                          : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}