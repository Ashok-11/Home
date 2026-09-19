// Session boundary: auth is an httpOnly cookie the backend owns; the frontend's one
// duty is wiping the react-query cache so one account's data never renders for the next.
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { apiGet, apiPost } from "./api";
import type { UserPublic } from "./types";

// "Who am I" for the whole app — 401 (ApiError) means not logged in.
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<UserPublic>("/auth/me"),
    retry: false,
    staleTime: Infinity,
  });
}

// Call after every successful login/signup.
export function beginSession(): void {
  queryClient.clear();
}

// Call from every sign-out control; the hard redirect resets all in-memory state.
export async function endSession(redirectTo: string = "/login"): Promise<void> {
  try {
    await apiPost("/auth/logout");
  } finally {
    queryClient.clear();
    window.location.assign(redirectTo);
  }
}
