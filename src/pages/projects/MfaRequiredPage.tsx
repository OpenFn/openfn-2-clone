import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import MfaRequiredCard from "../../components/projects/MfaRequiredCard";

/**
 * Inventory view `mfa-required` (ProjectLive.MFARequired): where a user
 * without MFA lands when a project requires it. The header has no title.
 */
export default function MfaRequiredPage() {
  return (
    <PageContent header={<Header />}>
      {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (px-6 py-8) */}
      <Centered className="flex justify-center px-6 py-8">
        <MfaRequiredCard />
      </Centered>
    </PageContent>
  );
}
