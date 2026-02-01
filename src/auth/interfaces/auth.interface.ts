export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    flowers: number;
    avatar?: string;
  };
}
