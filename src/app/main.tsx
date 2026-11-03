import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApiError } from "@/lib/api/client";
import { TokensRoute } from "@/pages/tokens/tokens.route";
import "@/theme/index.css";

// A bare router until the app decides how it's hosted: one path per page, and anything else goes to the first page.
const routes = { "/user-settings/api-tokens": TokensRoute };
const Route = routes[location.pathname as keyof typeof routes];
if (!Route) location.replace("/user-settings/api-tokens");

// A refusal (4xx) won't change on a retry; only a failure to answer might.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 3 } },
});

const root = document.getElementById("root");
if (root && Route) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Route />
      </QueryClientProvider>
    </StrictMode>,
  );
}
