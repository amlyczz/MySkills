import React from "react";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface Props {
  steps: Step[];
  activeStep?: number;
  className?: string;
}

export const StepIndicator: React.FC<Props> = ({ steps, activeStep = -1, className }) => (
  <div className={`flex flex-col gap-6 font-sans ${className || ""}`}>
    {steps.map((step, i) => {
      const isActive = activeStep === i;
      return (
        <div key={i} className="flex items-start gap-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
            style={{
              background: isActive ? "var(--color-primary,#4285F4)" : "rgba(255,255,255,0.1)",
              color: isActive ? "#fff" : "var(--color-muted,#888)",
            }}
          >
            {step.number}
          </div>
          <div>
            <div className="font-bold text-lg text-[var(--color-foreground,#fff)]">{step.title}</div>
            <div className="text-[var(--color-muted,#AAA)] text-base mt-1 leading-relaxed">{step.description}</div>
          </div>
        </div>
      );
    })}
  </div>
);
