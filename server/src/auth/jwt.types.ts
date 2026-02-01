export type Role = "user" | "admin";

export interface AuthTokenPayload {
    userId: number;
    userEmail: string;
    userIsApproved: boolean;
    role: Role;
}
