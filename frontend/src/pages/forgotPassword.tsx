import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { API_URL } from "@/lib/api";
import {
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    Field,
} from "../components/ui/field";
import { Spinner } from "../components/ui/spinner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

type ForgotPasswordStep = "email" | "code" | "new_password";

export function ForgotPasswordPage() {
    return (
        <div className="flex min-h-svh min-w-svw items-center justify-center">
            <div className="w-sm sm:w-md">
                <ForgotPasswordForm />
            </div>
        </div>
    );
}

export function ForgotPasswordForm() {
    const navigate = useNavigate();

    const [loading, setLoading] = React.useState(false);
    const [sendingCode, setSendingCode] = React.useState(false);
    const sendCodeLock = React.useRef(false);
    const [err, setErr] = React.useState<string | null>(null);
    const [step, setStep] = React.useState<ForgotPasswordStep>("email");
    const [email, setEmail] = React.useState("");
    const [code, setCode] = React.useState("");
    const [resetToken, setResetToken] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [formKey, setFormKey] = React.useState(0);

    React.useEffect(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) {
            active.blur();
        }
    }, [step]);

    function handleTryAgain() {
        setErr(null);
        setStep("email");
        setCode("");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
        setLoading(false);
        setFormKey((k) => k + 1);
    }

    async function sendResetCode(resetEmail: string) {
        if (sendCodeLock.current) return;

        sendCodeLock.current = true;
        setSendingCode(true);
        setErr(null);

        try {
            const res = await fetch(`${API_URL}/auth/request_code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: resetEmail,
                    flow: "reset",
                }),
            });

            const text = await res.text();
            const json = text ? JSON.parse(text) : {};

            if (!res.ok) {
                throw new Error(
                    json?.error?.message ??
                    json?.message ??
                    json?.error?.code ??
                    "INTERNAL_ERROR",
                );
            }

            setStep("code");
        } catch (error) {
            setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
        } finally {
            sendCodeLock.current = false;
            setSendingCode(false);
        }
    }

    async function verifyResetCode() {
        setLoading(true);
        setErr(null);

        try {
            const res = await fetch(`${API_URL}/auth/verify_code`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email: email.trim(),
                    code: code.trim(),
                    flow: "reset",
                }),
            });

            const text = await res.text();
            const json = text ? JSON.parse(text) : {};

            if (!res.ok) {
                throw new Error(
                    json?.error?.message ??
                    json?.message ??
                    json?.error?.code ??
                    "INTERNAL_ERROR",
                );
            }

            const token =
                json?.data?.resetToken ??
                json?.data?.verificationToken ??
                json?.data?.token ??
                json?.resetToken ??
                json?.verificationToken ??
                json?.token;

            if (!token) {
                throw new Error("Missing reset token");
            }

            setResetToken(token);
            setStep("new_password");
        } catch (error) {
            setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
        } finally {
            setLoading(false);
        }
    }

    async function submitNewPassword() {
        setLoading(true);
        setErr(null);

        try {
            if (newPassword !== confirmPassword) {
                throw new Error("Passwords do not match");
            }

            const res = await fetch(`${API_URL}/auth/reset_password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    resetToken,
                    password: newPassword,
                }),
            });

            const text = await res.text();
            const json = text ? JSON.parse(text) : {};

            if (!res.ok) {
                throw new Error(
                    json?.error?.message ??
                    json?.message ??
                    json?.error?.code ??
                    "INTERNAL_ERROR",
                );
            }

            navigate("/login", { replace: true });
        } catch (error) {
            setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
        } finally {
            setLoading(false);
        }
    }

    return (
        <FieldSet key={formKey}>
            <FieldLegend className="flex flex-col items-center gap-2 text-center font-semibold">
                <Link to="/">
                    <ShoppingBag />
                </Link>
                <p>Reset your password</p>
            </FieldLegend>

            <FieldDescription className="text-center">
                Remembered it? <Link to="/login">Log in</Link>
            </FieldDescription>

            <FieldSeparator>Or</FieldSeparator>

            {loading && (
                <div className="flex justify-center">
                    <Spinner />
                </div>
            )}

            {err !== null && (
                <div className="flex flex-col items-center gap-3">
                    <FieldDescription className="text-center text-red-500">{err}</FieldDescription>

                    <Button type="button" variant="outline" onClick={handleTryAgain}>
                        Try again
                    </Button>
                </div>
            )}

            <FieldGroup>
                {step === "email" && (
                    <>
                        <Field>
                            <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                            <Input
                                id="forgot-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                            />
                        </Field>

                        <Field>
                            <Button
                                type="button"
                                onClick={() => sendResetCode(email.trim())}
                                disabled={loading || sendingCode || !email.trim()}
                            >
                                {sendingCode ? "Sending..." : "Send reset code"}
                            </Button>
                        </Field>
                    </>
                )}

                {step === "code" && (
                    <>
                        <Field>
                            <FieldLabel htmlFor="reset-code">6-digit reset code</FieldLabel>
                            <Input
                                id="reset-code"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                autoComplete="one-time-code"
                            />
                        </Field>

                        <Field>
                            <Button
                                type="button"
                                onClick={verifyResetCode}
                                disabled={loading || code.trim().length !== 6}
                            >
                                {loading ? "Verifying..." : "Verify code"}
                            </Button>
                        </Field>

                        <Field>
                            <Button type="button" variant="outline" onClick={() => setStep("email")}>
                                Back
                            </Button>
                        </Field>
                    </>
                )}

                {step === "new_password" && (
                    <>
                        <Field>
                            <FieldLabel htmlFor="new-password">New password</FieldLabel>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </Field>

                        <Field>
                            <Button
                                type="button"
                                onClick={submitNewPassword}
                                disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
                            >
                                {loading ? "Updating..." : "Reset password"}
                            </Button>
                        </Field>
                    </>
                )}
            </FieldGroup>
        </FieldSet>
    );
}