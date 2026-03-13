import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import "./index.css";
import "./lib/i18n";
import { LandingPage } from "./components/feature/landing-page";
import Root from "./routes/root";
import Participants from "./routes/participants";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    element: <Root />,
    children: [
      {
        path: "participants",
        element: <Participants />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light">
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
