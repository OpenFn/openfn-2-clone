import { isApiError } from "@/lib/api/client";
import { useTokens, useTokenSaves } from "@/lib/api/tokens";
import { TokensPage } from "./TokensPage";

/** The tokens page on Lightning's API: the only file in this folder that fetches. */
export function TokensRoute() {
  const { status, tokens, retry } = useTokens();
  const { create, revoke } = useTokenSaves();

  // Lightning wants your password again before it makes a token. Asking for it isn't built yet (it waits for forms).
  const generate = () =>
    create().catch((error: unknown) => {
      throw isApiError(error, "step_up_required") ? new Error(`${error.message} Asking for it here isn't built yet.`) : error;
    });

  return <TokensPage status={status} tokens={tokens} onGenerate={generate} onDelete={revoke} onRetry={retry} />;
}
