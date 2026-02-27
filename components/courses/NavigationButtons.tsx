import { ArrowLeft, ChevronRight } from 'lucide-react';

interface NavigationButtonsProps {
  currentStep: number;
  steps: { number: number; title: string; canNavigate: boolean }[];
  onStepChange: (step: number) => void;
}

export function NavigationButtons({ currentStep, steps, onStepChange }: NavigationButtonsProps) {
  return (
    <div className="flex justify-between mt-6 pt-6 border-t border-slate-100">
      {currentStep > 1 && (
        <button
          onClick={() => {
            const prevStep = steps.filter((s) => s.number < currentStep).slice(-1)[0];
            if (prevStep) onStepChange(prevStep.number);
          }}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      )}

      {currentStep < 3 && currentStep !== 1.25 && currentStep !== 1.5 && currentStep !== 1 && (
        <button
          onClick={() => {
            const nextStep = steps.filter((s) => s.number > currentStep).slice(0, 1)[0];
            if (nextStep?.canNavigate) onStepChange(nextStep.number);
          }}
          className="inline-flex items-center px-4 py-2 bg-teal-primary text-white rounded-xl hover:bg-teal-primary/90 font-medium ml-auto"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      )}
    </div>
  );
}
