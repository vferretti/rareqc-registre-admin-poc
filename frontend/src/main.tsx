import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import "./index.css";
import "./lib/i18n";
import { LandingPage } from "./components/feature/landing-page";
import Root from "./routes/root";
import Participants from "./routes/participants";
import ParticipantDetail from "./routes/participant";
import ActivityLogs from "./routes/activity-logs";
import Home from "./routes/home";
import Communications from "./routes/communications";
import Admin from "./routes/admin";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    element: <Root />,
    children: [
      {
        path: "home",
        element: <Home />,
      },
      {
        path: "participants",
        element: <Participants />,
      },
      {
        path: "participants/:id",
        element: <ParticipantDetail />,
      },
      {
        path: "communications",
        element: <Communications />,
      },
      {
        path: "activity",
        element: <ActivityLogs />,
      },
      {
        path: "admin",
        element: <Admin />,
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
