export type Role = "user" | "admin" | "visitor";

export interface AuthTokenPayload {
    userId: number;
    userEmail: string;
    userIsApproved: boolean;
    role: Role;
}
