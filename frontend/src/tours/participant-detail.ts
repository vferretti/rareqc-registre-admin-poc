import type { TourStepDef } from "@/hooks/useTour";

/** Tour steps for the participant detail page. */
export const participantDetailTour: TourStepDef[] = [
  {
    target: '[data-tour="identity"]',
    titleKey: "tour.identity_title",
    contentKey: "tour.identity_content",
  },
  {
    target: '[data-tour="contacts"]',
    titleKey: "tour.contacts_title",
    contentKey: "tour.contacts_content",
  },
  {
    target: '[data-tour="consents"]',
    titleKey: "tour.consents_title",
    contentKey: "tour.consents_content",
  },
  {
    target: '[data-tour="activity"]',
    titleKey: "tour.activity_title",
    contentKey: "tour.activity_content",
  },
];
