import Menu, { MenuDivider, MenuHeader, MenuItem, MenuLink } from "../primitives/Menu";
import UserAvatar from "../primitives/UserAvatar";
import Heading from "../primitives/Heading";
import Text from "../primitives/Text";

/** What the account menu shows of the signed-in user. */
export interface MenuUser {
  firstName: string;
  lastName: string;
  email: string;
  /** The user turned experimental features on; the menu says so. */
  experimentalFeatures: boolean;
}

const items = [
  { to: "/projects", icon: "hero-folder", label: "Projects" },
  { to: "/profile", icon: "hero-user-circle", label: "User Profile" },
  { to: "/credentials", icon: "hero-key", label: "Credentials" },
  { to: "/profile/tokens", icon: "hero-command-line", label: "API Tokens" },
];

/**
 * The account button at the top of the side menu and its dropdown
 * (Lightning's `user_menu_dropdown`): who you're signed in as, the
 * experimental-features notice, your pages, and log out.
 */
export default function UserMenu({ user }: { user: MenuUser }) {
  return (
    <div className="mx-3 min-w-0 flex-1">
      <Menu
        align="start"
        modal={false}
        trigger={
          // eslint-disable-next-line no-restricted-syntax -- sidebar chrome, styled by the themes through data-ui=account-trigger
          <button
            type="button"
            data-ui="account-trigger"
            // eslint-disable-next-line no-restricted-syntax -- a control that owns its type: the account button
            className="user-menu-trigger flex h-10 w-full items-center rounded-lg bg-white/10 text-sm font-medium text-inverse transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <div className="user-menu-content flex w-full min-w-0 items-center">
              <UserAvatar firstName={user.firstName} lastName={user.lastName} className="shrink-0" />
              <span className="user-menu-text min-w-0 flex-1 truncate text-left">
                {user.firstName}
                {user.lastName ? " " + user.lastName : ""}
              </span>
              <span className="user-menu-chevron hero-chevron-down h-4 w-4 shrink-0 text-white/70" />
            </div>
          </button>
        }
      >
        <MenuHeader>
          <p className="text-body">Signed in as</p>
          <p className="truncate font-medium text-strong">{user.email}</p>
        </MenuHeader>
        {user.experimentalFeatures && (
          <div className="bg-amber-50 px-4 py-3">
            <Heading size="sm" as="p" className="flex items-center gap-1.5">
              <span className="hero-wrench-screwdriver-mini h-4 w-4 text-amber-600" />
              Experimental features on
            </Heading>
            <Text as="p" variant="body-sm" tone="muted" className="mt-0.5">
              You're using features that are still being built. Things may work differently for you than for your
              teammates.
            </Text>
            <Text as="p" variant="body-sm" className="mt-1.5 text-amber-700">
              <MenuLink to="/profile">Turn off in your profile</MenuLink>
            </Text>
          </div>
        )}
        <MenuDivider />
        {items.map((item) => (
          <MenuItem key={item.to} to={item.to} icon={item.icon}>
            {item.label}
          </MenuItem>
        ))}
        <MenuDivider />
        <MenuItem to="/users/log_out">Log out</MenuItem>
      </Menu>
    </div>
  );
}
