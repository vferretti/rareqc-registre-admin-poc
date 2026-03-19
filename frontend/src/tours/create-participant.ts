import type { TourStepDef } from "@/hooks/useTour";

/** Tour steps for the create participant form. */
export const createParticipantTour: TourStepDef[] = [
  {
    target: '[data-tour="form-identity"]',
    titleKey: "create_tour.identity_title",
    contentKey: "create_tour.identity_content",
  },
  {
    target: '[data-tour="form-coordinates"]',
    titleKey: "create_tour.coordinates_title",
    contentKey: "create_tour.coordinates_content",
  },
  {
    target: '[data-tour="form-contacts"]',
    titleKey: "create_tour.contacts_title",
    contentKey: "create_tour.contacts_content",
  },
];
