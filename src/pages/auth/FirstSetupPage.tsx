import Header from "../../components/primitives/Header";
import Button from "../../components/primitives/Button";
import Form from "../../components/primitives/Form";
import { PasswordInput, TextInput } from "../../components/primitives/Inputs";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import { useForm } from "../../utils/useForm";
import { blank, isValidEmail } from "../../utils/validate";

export interface FirstSetupValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

/** The contract between this page and whatever feeds it (the replica wrapper, later Lightning). */
export interface FirstSetupPageProps {
  /** Creates the superuser. Resolves when the host accepts (it then signs the user in); rejects with field errors or a message. */
  onSave: (values: FirstSetupValues) => Promise<void>;
}

/**
 * Inventory view `first-setup` (first_setup_live/superuser.html.heex): the
 * form that creates the first superuser on a fresh install. The page checks
 * what Lightning's changeset checks (names, email, a 12-character password
 * that matches its confirmation) before a save, and shows the host's field
 * errors on their fields. Props only: the shell around it is the host's.
 */
export default function FirstSetupPage({ onSave }: FirstSetupPageProps) {
  const form = useForm<FirstSetupValues>({
    initial: { firstName: "", lastName: "", email: "", password: "", passwordConfirmation: "" },
    validate: ({ firstName, lastName, email, password, passwordConfirmation }) => ({
      firstName: blank(firstName),
      lastName: blank(lastName),
      email: email.trim() && !isValidEmail(email) ? ["must be a valid email address"] : blank(email),
      password: password.length < 12 ? ["Password minimum length is 12 characters."] : [],
      passwordConfirmation: passwordConfirmation !== password ? ["does not match confirmation"] : [],
    }),
  });

  return (
    <PageContent header={<Header title="Setup" size="xl" />}>
      <Centered>
        <p>
          Looks like this is a fresh install of OpenFn Lightning. Create a superuser account to manage projects and
          users.
        </p>
        <Form
          id="superuser-registration-form"
          {...form.formProps(onSave)}
          className="mt-4 w-1/2"
          actions={
            <Button type="submit">
              Save
            </Button>
          }
        >
          <TextInput id="first_name" name="first_name" label="First name" {...form.fieldProps("firstName")} />
          <TextInput id="last_name" name="last_name" label="Last name" {...form.fieldProps("lastName")} />
          <TextInput id="email" name="email" type="email" label="Email" {...form.fieldProps("email")} />
          <PasswordInput id="password" name="password" label="Password" autoComplete="new-password" {...form.fieldProps("password")} />
          <PasswordInput
            id="password_confirmation"
            name="password_confirmation"
            label="Password confirmation"
            autoComplete="new-password"
            {...form.fieldProps("passwordConfirmation")}
          />
        </Form>
      </Centered>
    </PageContent>
  );
}
