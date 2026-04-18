import { createContext, useContext } from "react";

export type AccordionContextProps = {
  history: string[];
};

export const AccordionContext = createContext<AccordionContextProps>({
  history: [],
});

export function useAccordionContext() {
  return useContext(AccordionContext);
}
