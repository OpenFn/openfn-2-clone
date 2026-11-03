import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTokenSaves, useTokens } from "../../api/tokens";
import { useToast } from "../../components/primitives/Toast";
import TokensPage from "./TokensPage";

/**
 * The replica's side of TokensPage: the tokens come from Lightning's API (or
 * its stand-in), the delete modal's token from the URL, and the success
 * toasts are Lightning's flashes. The new token's whole value arrives once,
 * in the answer that creates it, so it's held here for the banner. Lightning
 * will replace this file with a LiveView wrapper; TokensPage stays as it is.
 */
export default function TokensPageReplica() {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { status, tokens } = useTokens();
  const saves = useTokenSaves();
  const [newToken, setNewToken] = useState<string | null>(null);

  return (
    <TokensPage
      status={status}
      tokens={tokens}
      newToken={newToken}
      tokenId={tokenId ?? null}
      onGenerate={async () => {
        setNewToken(await saves.generate());
        toast("Token created successfully");
      }}
      onDelete={async (id) => {
        await saves.onDelete(id);
        toast("Token deleted successfully");
      }}
      onClose={() => navigate("/profile/tokens")}
    />
  );
}
