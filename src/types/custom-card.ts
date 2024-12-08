import type { Users } from "./users";

interface BaseFriendCardProps {
  user: Users;
  className?: string;
  action?: React.ReactNode;
}

interface NonInteractiveProps extends BaseFriendCardProps {
  interactive?: false;
  onClick?: never;
}

interface InteractiveProps extends BaseFriendCardProps {
  interactive: true;
  onClick: () => void;
}

export type FriendCardProps = NonInteractiveProps | InteractiveProps;
