import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@embeddr/react-ui/ui";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onOpenSettingsTab: (tab: string) => void;
}

export function OnboardingDialog({
  open,
  onOpenChange,
  onComplete,
  onOpenSettingsTab,
}: OnboardingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-180">
        <DialogHeader>
          <DialogTitle>Welcome to Embeddr</DialogTitle>
          <DialogDescription>
            A short guided setup to get your first results fast.
          </DialogDescription>
        </DialogHeader>
        <OnboardingWizard
          onComplete={() => {
            onComplete();
            onOpenChange(false);
          }}
          onOpenSettingsTab={onOpenSettingsTab}
        />
      </DialogContent>
    </Dialog>
  );
}
