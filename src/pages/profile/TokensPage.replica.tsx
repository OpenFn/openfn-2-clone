import { useEffect, useRef, useState } from "react";
import { useDocumentTitle } from "../../utils/useDocumentTitle";
import { useNavigate, useParams } from "react-router-dom";
import { isStepUpRequired } from "../../api/client";
import { useTokenSaves, useTokens } from "../../api/tokens";
import { useToast } from "../../components/primitives/Toast";
import TokensPage from "./TokensPage";

/**
 * The replica's side of TokensPage: the tokens come from Lightning's API (or
 * its stand-in), the delete modal's token from the URL, and the success
 * toasts are Lightning's flashes. When Lightning's API wants the password
 * again before creating a token, Generate goes to confirm access first. The new token's whole value arrives once,
 * in the answer that creates it, so it's held here for the banner. Lightning
 * will replace this file with a LiveView wrapper; TokensPage stays as it is.
 */
export default function TokensPageReplica() {
  useDocumentTitle("Personal Access Tokens");
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { status, tokens } = useTokens();
  const saves = useTokenSaves();
  const [newToken, setNewToken] = useState<string | null>(null);
  // The one just deleted here leaves the list before the modal closes; that isn't a refusal.
  const deleted = useRef<string | null>(null);
  // Lightning refuses the delete route for a token that isn't yours (tokens_live/index.ex :delete).
  const refused = status.state === "ready" && !!tokenId && !tokens.some((t) => t.id === tokenId);

  // Once per refusal: StrictMode runs the effect twice.
  const refusing = useRef(false);
  useEffect(() => {
    const refusal = refused && tokenId !== deleted.current;
    if (!refusal || refusing.current) {
      refusing.current = refusal;
      return;
    }
    refusing.current = true;
    toast("You can't perform this action", "danger");
    navigate("/profile/tokens", { replace: true });
  }, [refused, tokenId, toast, navigate]);

  return (
    <TokensPage
      status={status}
      tokens={tokens}
      newToken={newToken}
      tokenId={tokenId ?? null}
      onGenerate={async () => {
        try {
          setNewToken(await saves.generate());
        } catch (error) {
          // Lightning's API wants the password again first: confirm access, then come back and generate.
          if (!isStepUpRequired(error)) throw error;
          navigate(`/auth/confirm_access?return_to=${encodeURIComponent("/profile/tokens")}`);
          return;
        }
        toast("Token created successfully");
      }}
      onDelete={async (id) => {
        deleted.current = id;
        await saves.onDelete(id);
        toast("Token deleted successfully");
      }}
      onClose={() => navigate("/profile/tokens")}
    />
  );
}
