import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ReactRouterAdapter } from "./routing/ReactRouterAdapter";
import { HashRouter } from "react-router-dom";
import "./index.css";
import "./monacoSetup";
import App from "./App.tsx";
import { ToastProvider } from "./components/primitives/Toast";
import { ThemeProvider } from "./theme/ThemeProvider";
import { AnnotationsProvider } from "./annotations/AnnotationsContext";
import SettingsMenu from "./components/devtools/SettingsMenu";
import AnnotationsPanel from "./components/devtools/AnnotationsPanel";
import AnnotationsFrame from "./components/devtools/AnnotationsFrame";
import SessionProvider from "./session/SessionProvider";
import { session } from "./mock-data/users";
import { setAssetBase } from "./utils/assets";

// A refused request shows at once; Lightning's answer won't change on a retry.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

// Vite serves the replica under a base path; the library never reads it itself.
setAssetBase(import.meta.env.BASE_URL);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HashRouter>
          <ReactRouterAdapter>
            <AnnotationsProvider>
              <SessionProvider session={session}>
                <ToastProvider>
                  <AnnotationsFrame>
                    <App />
                  </AnnotationsFrame>
                </ToastProvider>
              </SessionProvider>
              {/* Demo tooling, outside the Lightning UI: annotations and themes. */}
              <AnnotationsPanel />
              <SettingsMenu />
            </AnnotationsProvider>
          </ReactRouterAdapter>
        </HashRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
