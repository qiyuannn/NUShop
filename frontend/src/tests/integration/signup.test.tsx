import {} from "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { server } from "./server";
import { useAuthStore } from "@/context/authStoreV2";
import { SignupForm } from "@/pages/signup";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { API_URL } from "@/lib/api";

describe("SignupForm", () => {
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
    cleanup();
    server.resetHandlers();
  });

  it("walks through email -> code -> credentials and logs the user in", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API_URL}/auth/request_code`, () => {
        return HttpResponse.json({ message: "Code sent" }, { status: 200 });
      }),
      http.post(`${API_URL}/auth/verify_code`, () => {
        return HttpResponse.json(
          {
            data: {
              verificationToken: "signup-verified-token-abc",
            },
          },
          { status: 200 },
        );
      }),
      http.post(`${API_URL}/create_user`, () => {
        return HttpResponse.json(
          {
            data: {
              token: "new-user-token",
              user: { id: "new-user-id" },
            },
          },
          { status: 201 },
        );
      }),
    );

    render(
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>,
    );

    // 1. Enter email
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    await user.type(emailInput, "newbie@nus.edu");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    // 2. Enter 6-digit code
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/6-digit code/i)).toBeInTheDocument();
    });
    const codeInput = screen.getByPlaceholderText(/6-digit code/i);
    await user.type(codeInput, "654321");
    await user.click(screen.getByRole("button", { name: /verify code/i }));

    // 3. Enter credentials
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    });
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/^password$/i);

    await user.type(usernameInput, "valid_user");
    await user.type(passwordInput, "ValidPass123");

    const createButton = screen.getByRole("button", { name: /create account/i });
    expect(createButton).not.toBeDisabled();
    await user.click(createButton);

    await waitFor(() => {
      expect(useAuthStore.getState().token).toBe("new-user-token");
      expect(useAuthStore.getState().userID).toBe("new-user-id");
    });
  });

  it("handles duplicate username error on final submission", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API_URL}/auth/request_code`, () => {
        return HttpResponse.json({ message: "Code sent" }, { status: 200 });
      }),
      http.post(`${API_URL}/auth/verify_code`, () => {
        return HttpResponse.json(
          {
            data: { verificationToken: "verified-token" },
          },
          { status: 200 },
        );
      }),
      http.post(`${API_URL}/create_user`, () => {
        return HttpResponse.json(
          { error: { code: "STATUS_CONFLICT" } },
          { status: 409 },
        );
      }),
    );

    render(
      <MemoryRouter>
        <SignupForm />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText(/enter your email/i), "taken@nus.edu");
    await user.click(screen.getByRole("button", { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/6-digit code/i)).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText(/6-digit code/i), "111222");
    await user.click(screen.getByRole("button", { name: /verify code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    });
    await user.type(screen.getByPlaceholderText(/username/i), "taken_username");
    await user.type(screen.getByPlaceholderText(/^password$/i), "Secret123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Username is already taken.")).toBeInTheDocument();
    });
  });
});
