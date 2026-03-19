import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Joyride, { type CallBackProps, STATUS, type Step } from "react-joyride";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/base/ui/button";

/** Tour step definition without Joyride internals. */
export interface TourStepDef {
  target: string;
  titleKey: string;
  contentKey: string;
}

/** Encapsulates react-joyride logic. Returns a trigger button and the tour component. */
export function useTour(stepDefs: TourStepDef[]) {
  const { t } = useTranslation();
  const [run, setRun] = useState(false);

  const steps: Step[] = stepDefs.map((s) => ({
    target: s.target,
    title: t(s.titleKey),
    content: t(s.contentKey),
    disableBeacon: true,
  }));

  const handleCallback = useCallback((data: CallBackProps) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false);
    }
  }, []);

  /** Button to start the tour. */
  function TourButton() {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => setRun(true)}
        title={t("tour.start")}
      >
        <HelpCircle className="size-4" />
      </Button>
    );
  }

  /** The Joyride component — render once in the page. */
  function TourOverlay() {
    if (steps.length === 0) return null;
    return (
      <Joyride
        steps={steps}
        run={run}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        callback={handleCallback}
        locale={{
          back: t("tour.back"),
          close: t("tour.close"),
          last: t("tour.last"),
          next: t("tour.next"),
          skip: t("tour.skip"),
        }}
        styles={{
          options: {
            primaryColor: "oklch(0.55 0.11 230)",
            zIndex: 10000,
          },
        }}
      />
    );
  }

  return { TourButton, TourOverlay };
}
