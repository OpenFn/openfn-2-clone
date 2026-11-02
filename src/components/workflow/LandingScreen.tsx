import { useState } from "react";
import { cn } from "../../utils/cn";
import Button from "../primitives/Button";
import Card from "../primitives/Card";
import Heading from "../primitives/Heading";
import { Field } from "../primitives/Inputs";
import Pill from "../primitives/Pill";
import TextLink from "../primitives/TextLink";
import AIDisclaimerFooter from "./AIDisclaimerFooter";
import Text from "../primitives/Text";

interface Props {
  aiAssistantEnabled?: boolean;
  onBuildWithAI: (prompt: string) => void;
  onBuildFromScratch: () => void;
  onBrowseTemplates: () => void;
  onImportYAML: () => void;
}

function OptionCard({ icon, title, description, onClick, testId }: { icon: string; title: string; description: string; onClick: () => void; testId: string }) {
  return (
    // eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-muted)
    <Card as="button" data-testid={testId} onClick={onClick} padding="lg" className="h-full text-muted">
      <div className="mb-3 w-fit rounded-lg bg-sunken p-2">
        <span className={cn("block h-5 w-5 text-body", icon)} />
      </div>
      <Heading size="sm" as="p">
        {title}
      </Heading>
      {/* eslint-disable-next-line local/primitive-classname -- debt: F525 margin (mt-1) */}
      <Text as="p" className="mt-1">
        {description}
      </Text>
    </Card>
  );
}

/**
 * What `/w/new` shows before there's a workflow (LandingScreen.tsx): build
 * with AI, build from scratch, browse templates, or import YAML.
 */
export default function LandingScreen({ aiAssistantEnabled = true, onBuildWithAI, onBuildFromScratch, onBrowseTemplates, onImportYAML }: Props) {
  const [prompt, setPrompt] = useState("");
  const valid = prompt.trim().length > 0;
  return (
    <div
      role="region"
      aria-labelledby="landing-screen-heading"
      className="absolute inset-0 z-10 flex items-center justify-center bg-page"
      data-testid="landing-screen"
      data-ui="page-body"
      data-annotation="workflow-editor-new"
    >
      <div className="flex w-full flex-col gap-6 px-6 md:max-w-xl lg:px-2">
        <Heading size="xl" as="h1" id="landing-screen-heading">
          Where would you like to start today?
        </Heading>
        {aiAssistantEnabled && (
          <Field
            id="build-with-ai-input"
            label="Build with AI"
            aside={
              <Pill color="green">
                <span className="hero-sparkles-micro h-3 w-3" />
                Recommended
              </Pill>
            }
          >
            {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (focus-within:shadow-card) */}
            <Card padding="none" className="focus-within:shadow-card">
              {/* eslint-disable-next-line no-restricted-syntax -- debt: chat composer; TextArea has no borderless variant (also AIAssistantPanel) */}
              <textarea
                id="build-with-ai-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    if (valid) onBuildWithAI(prompt);
                  }
                }}
                placeholder="e.g. Sync new KoboToolbox submissions into Postgres"
                rows={4}
                // eslint-disable-next-line no-restricted-syntax -- a control: the prompt box sets its own type
                className="block w-full resize-none border-none bg-transparent p-3 text-sm text-strong placeholder:text-faint focus:ring-0 focus:outline-none"
              />
              <div className="flex items-center justify-between px-3 py-2">
                <AIDisclaimerFooter variant="muted" />
                <Button variant="plain" size="sm" onClick={() => valid && onBuildWithAI(prompt)} disabled={!valid} icon="hero-arrow-right" iconPosition="right">
                  Build it
                </Button>
              </div>
            </Card>
          </Field>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <OptionCard
            testId="build-from-scratch-card"
            icon="hero-plus-circle"
            title="Build from scratch"
            description="Start with a webhook trigger and an empty first step."
            onClick={onBuildFromScratch}
          />
          <OptionCard
            testId="browse-templates-card"
            icon="hero-document-plus"
            title="Browse templates"
            description="Start from a published workflow template and adapt it."
            onClick={onBrowseTemplates}
          />
        </div>
        {/* eslint-disable-next-line local/primitive-classname -- debt: F528 type (text-center) */}
        <Text as="p" tone="muted" className="text-center">
          or{" "}
          <TextLink onClick={onImportYAML}>import a YAML file manually</TextLink>
        </Text>
      </div>
    </div>
  );
}
