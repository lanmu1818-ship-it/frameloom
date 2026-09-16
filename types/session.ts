/** Public session response; authorization must be enforced by the backend. */
export type Session = {
  expires: string;
  user: {
    id: string;
    email?: string | null;
    image?: string | null;
    name?: string | null;
    teamId?: string | null;
    teamRole?: "member" | "admin" | "owner" | null;
    type?: "regular" | "guest";
  };
};
