import FormModal from "../primitives/FormModal";
import { TextArea } from "../primitives/Inputs";
import NameField from "../primitives/NameField";
import Text from "../primitives/Text";
import { urlSafeName } from "../../utils/format";
import { useForm } from "../../utils/useForm";
import { blank } from "../../utils/validate";
import { Stack } from "../primitives/Stack";

/**
 * "Create a new project" (DashboardLive.ProjectCreationModal): Name, with
 * the URL-safe name it will get, and an optional Description. Create with
 * an invalid name shows its error instead of submitting. Server field errors
 * (keyed `rawName`, `description`) show on their fields.
 */
export default function CreateProjectModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate?: (project: { name: string; description: string }) => Promise<void>;
}) {
  const form = useForm({
    initial: { rawName: "", description: "" },
    validate: ({ rawName, description }) => ({
      rawName: blank(urlSafeName(rawName)),
      description: description.length > 240 ? ["should be at most 240 character(s)"] : [],
    }),
  });

  const close = () => {
    form.reset();
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={close}
      title="Create a new project"
      size="md"
      formId="project-form"
      onSubmit={form.modalSubmit(async ({ rawName, description }) => {
        await onCreate?.({ name: urlSafeName(rawName), description });
        close();
      })}
      submitLabel="Create project"
      cancelId="cancel-project-creation"
    >
      <NameField
        id="project_raw_name"
        required
        {...form.fieldProps("rawName")}
        badgeLabel="Your project will be named"
      />
      <Stack gap="sm">
        <TextArea id="project_description" label="Description" {...form.fieldProps("description")} />
        <Text as="p" variant="body-sm" tone="muted">
          A short description of a project [max 240 characters]
        </Text>
      </Stack>
    </FormModal>
  );
}
