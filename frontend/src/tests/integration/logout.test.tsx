import {} from "@testing-library/jest-dom/vitest";
import {  renderHook } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "./server";
import { useAuthStore } from "@/context/authStoreV2";
import { http, HttpResponse } from "msw";
import { API_URL } from "@/lib/api";
import { useLogout } from "@/hooks/use-logout";
import { MemoryRouter } from "react-router-dom";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("logout", () => {
  beforeAll(() => {
    server.listen()
    navigateMock.mockClear();
  })
  beforeEach(() => {
    useAuthStore.setState({ token: "token", userID: "user"})
  })
  afterAll(() => {
    server.close()
  })
  afterEach(() => {
    server.resetHandlers()
  })

  it("token and userID is cleared from global context", () => {
    server.use(
      http.put(`${API_URL}/auth/logout`, () => {
        return HttpResponse.json(null, { status: 200 })
      })
    )
    
    const { result } = renderHook(() => useLogout(), { wrapper: MemoryRouter})
    const logout = result.current

    logout()

    expect(useAuthStore.getState().token).toBe(null)
    expect(useAuthStore.getState().userID).toBe(null)
  })
})