import {} from "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { server } from "./server";
import { useAuthStore } from "@/context/authStoreV2";
import { LoginForm } from "@/pages/login";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { API_URL } from "@/lib/api";
import { vi } from "vitest";

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <div data-testid="mock-google-login">Google Login</div>,
}));

describe("login", () => {
  beforeAll(() => {
    server.listen();
  });
  beforeEach(() => {
    useAuthStore.setState({ token: null, userID: null });
  });
  afterAll(() => {
    server.close();
  });
  afterEach(() => {
    server.resetHandlers();
  });

  it("submits email and password, proceeds to code verification step, and sets token and userID", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API_URL}/login`, async ({ request }) => {
        const body = (await request.json()) as { email: string; password: string };
        if (body.email === "student@nus.edu" && body.password === "correctpass") {
          return HttpResponse.json({ message: "Password OK" }, { status: 200 });
        }
        return HttpResponse.json({ message: "Invalid credentials" }, { status: 401 });
      }),
      http.post(`${API_URL}/auth/request_code`, () => {
        return HttpResponse.json({ message: "Code sent" }, { status: 200 });
      }),
      http.post(`${API_URL}/auth/verify_code`, async ({ request }) => {
        const body = (await request.json()) as { email: string; code: string };
        if (body.code === "123456") {
          return HttpResponse.json(
            {
              data: {
                token: "mock-jwt-token-xyz",
                user: { id: "user-123", email: "student@nus.edu" },
              },
            },
            { status: 200 },
          );
        }
        return HttpResponse.json({ message: "Invalid code" }, { status: 400 });
      }),
    );

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    // Initial password step
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole("button", { name: /^login$/i });

    await user.type(emailInput, "student@nus.edu");
    await user.type(passwordInput, "correctpass");
    await user.click(loginButton);

    // Should transition to verification code step
    await waitFor(() => {
      expect(screen.getByLabelText(/6-digit verification code/i)).toBeInTheDocument();
    });

    const codeInput = screen.getByLabelText(/6-digit verification code/i);
    const verifyButton = screen.getByRole("button", { name: /verify code/i });

    await user.type(codeInput, "123456");
    await user.click(verifyButton);

    // Checks auth store update
    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe("mock-jwt-token-xyz");
      expect(useAuthStore.getState().userID).toBe("user-123");
    });
  });

  it("displays error message when login credentials fail", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API_URL}/login`, () => {
        return HttpResponse.json({ message: "Invalid email or password" }, { status: 401 });
      }),
    );

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "wrong@nus.edu");
    await user.type(screen.getByLabelText(/password/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    // Clicking try again resets error and allows re-entering password
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.queryByText("Invalid email or password")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});