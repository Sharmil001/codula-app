"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";

type Step = {
  number: number;
  name: string;
  required: boolean;
  description: string;
};

type OnboardingHeaderProps = {
  currentStep: number;
  maxAllowedStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
};

const steps: Step[] = [
  {
    number: 1,
    name: "Connect GitHub",
    required: true,
    description: "Link your GitHub account to get started",
  },
  {
    number: 2,
    name: "Select Repos",
    required: true,
    description: "Choose repositories to track and analyze",
  },
  {
    number: 3,
    name: "Twitter Profile",
    required: false,
    description: "Add your social media presence",
  },
  {
    number: 4,
    name: "Skills",
    required: true,
    description: "Tell us about your technical expertise",
  },
];

export function OnboardingHeader({
  currentStep,
  maxAllowedStep,
  completedSteps,
  onStepClick,
}: OnboardingHeaderProps) {
  const pathname = usePathname();

  const allStepsCompleted =
    completedSteps.length === 4 &&
    [1, 2, 3, 4].every((step) => completedSteps.includes(step));

  if (!pathname.startsWith("/onboarding")) return null;

  if (allStepsCompleted) {
    return null;
  }

  const isStepAccessible = (stepNumber: number) => {
    return stepNumber <= maxAllowedStep;
  };

  const isStepCompleted = (stepNumber: number) => {
    return completedSteps.includes(stepNumber);
  };

  const completedCount = completedSteps.length;
  const progressPercentage = (completedCount / steps.length) * 100;

  return (
    <>
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold text-foreground hover:text-primary transition-colors"
            >
              Codula
            </Link>
            <div className="text-sm text-muted-foreground">
              Setup Progress: {completedCount} of {steps.length} completed
            </div>
          </div>
        </div>
      </header>

      {/* Left Sidebar */}
      <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 bg-card border-r border-border p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Setup Progress
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">
                  {completedCount}/{steps.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              SETUP STEPS
            </h3>
            {steps.map((step, index) => {
              const isCurrentStep = currentStep === step.number;
              const isCompleted = isStepCompleted(step.number);
              const isAccessible = isStepAccessible(step.number);
              const isDisabled = !isAccessible || allStepsCompleted;

              return (
                <div key={step.number} className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (isAccessible && !allStepsCompleted) {
                        onStepClick(step.number);
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all duration-200 group",
                      isCurrentStep
                        ? "bg-primary/5 border-primary/20 shadow-sm"
                        : isCompleted
                          ? "bg-green-50 border-green-200 hover:bg-green-100"
                          : isAccessible
                            ? "bg-background border-border hover:bg-muted/50 hover:border-border/60"
                            : "bg-muted/30 border-muted cursor-not-allowed",
                      !isDisabled && "hover:shadow-sm",
                    )}
                    title={
                      allStepsCompleted
                        ? "Onboarding complete - redirecting to dashboard"
                        : !isAccessible
                          ? "Complete previous steps first"
                          : step.description
                    }
                  >
                    <div className="flex items-start space-x-3">
                      {/* Step Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                            isCurrentStep
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : isCompleted
                                ? "bg-green-500 text-white"
                                : isAccessible
                                  ? "bg-muted text-muted-foreground border-2 border-primary/20"
                                  : "bg-muted text-muted-foreground/50",
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" />
                          ) : !isAccessible ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            step.number
                          )}
                        </div>
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4
                            className={cn(
                              "font-medium text-sm",
                              isCurrentStep
                                ? "text-primary"
                                : isCompleted
                                  ? "text-green-700"
                                  : isAccessible
                                    ? "text-foreground"
                                    : "text-muted-foreground/70",
                            )}
                          >
                            {step.name}
                          </h4>
                          {!step.required && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                              optional
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-xs mt-1 leading-relaxed",
                            isCurrentStep
                              ? "text-primary/70"
                              : isCompleted
                                ? "text-green-600"
                                : isAccessible
                                  ? "text-muted-foreground"
                                  : "text-muted-foreground/50",
                          )}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>

                  {index < steps.length - 1 && (
                    <div className="flex justify-start pl-4">
                      <div
                        className={cn(
                          "w-0.5 h-6 ml-3.5 transition-colors",
                          isCompleted
                            ? "bg-green-300"
                            : isCurrentStep
                              ? "bg-primary/30"
                              : "bg-border",
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-border">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                NEED HELP?
              </h3>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>• Complete each step in order</p>
                <p>• All required steps must be finished</p>
                <p>• You can skip optional steps</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
