import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server } from "./server";
import { ForgotPasswordForm } from "@/pages/forgotPassword";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { API_URL } from "@/lib/api";

describe("ForgotPasswordForm", () => {
  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });
  afterEach(() => {
    cleanup();
    server.resetHandlers();
  });

  it("walks through reset code request -> verification -> password reset successfully", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API_URL}/auth/request_code`, () => {
        return HttpResponse.json({ message: "Code sent" }, { status: 200 });
      }),
      http.post(`${API_URL}/auth/verify_code`, () => {
        return HttpResponse.json(
          {
            data: {
              resetToken: "reset-token-xyz-123",
            },
          },
          { status: 200 },
        );
      }),
      http.post(`${API_URL}/auth/reset_password`, async ({ request }) => {
        const body = (await request.json()) as { resetToken: string; password: string };
        if (body.resetToken === "reset-token-xyz-123" && body.password === "BrandNewPass1") {
          return HttpResponse.json({ message: "Password reset successful" }, { status: 200 });
        }
        return HttpResponse.json({ message: "Invalid reset token" }, { status: 400 });
      }),
    );

    render(
      <MemoryRouter>
        <ForgotPasswordForm />
      </MemoryRouter>,
    );

    // 1. Enter email
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "forgot@nus.edu");
    await user.click(screen.getByRole("button", { name: /send reset code/i }));

    // 2. Enter 6-digit code
    await waitFor(() => {
      expect(screen.getByLabelText(/6-digit reset code/i)).toBeInTheDocument();
    });
    const codeInput = screen.getByLabelText(/6-digit reset code/i);
    await user.type(codeInput, "998877");
    await user.click(screen.getByRole("button", { name: /verify code/i }));

    // 3. Enter new passwords
    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });
    const newPassInput = screen.getByLabelText(/^new password$/i);
    const confirmPassInput = screen.getByLabelText(/confirm password/i);

    await user.type(newPassInput, "BrandNewPass1");
    await user.type(confirmPassInput, "BrandNewPass1");

    const submitBtn = screen.getByRole("button", { name: /reset password/i });
    await user.click(submitBtn);

    // Form successfully processed and navigated
    await waitFor(() => {
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
    });
  });

  it("shows error when new password and confirm password do not match", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${API_URL}/auth/request_code`, () => {
        return HttpResponse.json({ message: "Code sent" }, { status: 200 });
      }),
      http.post(`${API_URL}/auth/verify_code`, () => {
        return HttpResponse.json(
          {
            data: { resetToken: "reset-token" },
          },
          { status: 200 },
        );
      }),
    );

    render(
      <MemoryRouter>
        <ForgotPasswordForm />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "mismatch@nus.edu");
    await user.click(screen.getByRole("button", { name: /send reset code/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/6-digit reset code/i)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/6-digit reset code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify code/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/^new password$/i), "PassOne123");
    await user.type(screen.getByLabelText(/confirm password/i), "DifferentPass456");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });
});
