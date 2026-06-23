import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { FieldDescription, FieldLegend, FieldSeparator, FieldSet } from "../components/ui/field";
import { Spinner } from "../components/ui/spinner";
import { Button } from "../components/ui/button";

export function SignupPage() {
  return (
    <div className="flex min-w-svw items-center justify-center min-h-svh">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}

export function SignupForm() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [step, setStep] = React.useState<"email" | "code" | "credentials">("email");
  const [verificationToken, setVerificationToken] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  async function sendCode() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_URL}/auth/request_code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), flow: "signup" }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json?.error?.message ?? json?.error?.code ?? "INTERNAL_ERROR");

      setStep("code");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_URL}/auth/verify_code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json?.error?.message ?? json?.error?.code ?? "INTERNAL_ERROR");

      const verificationToken =
        json?.data?.verificationToken ??
        json?.data?.token ??
        json?.verificationToken ??
        json?.token;

      if (!verificationToken) {
        throw new Error("Missing verification token");
      }

      setVerificationToken(verificationToken);
      setStep("credentials");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
    } finally {
      setLoading(false);
    }
  }

  async function completeSignup() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_URL}/create_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          password,
          verificationToken,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409 || json?.error?.code === "STATUS_CONFLICT") {
          throw new Error("Account already exists. Please log in.");
        }

        throw new Error(json?.error?.message ?? json?.error?.code ?? "INTERNAL_ERROR");
      }

      setUser(json.data.user);
      setToken(json.data.token);
      navigate("/");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FieldSet>
      <FieldLegend className="flex flex-col items-center gap-2 text-center font-semibold">
        <Link className="flex gap-1 font-bold" to="/">
          <ShoppingBag />
          <p>NUShop</p>
        </Link>
        <p>Create your account</p>
      </FieldLegend>

      <FieldDescription className="text-center">
        Have an account? <Link to="/login">Log in</Link>
      </FieldDescription>

      {loading && (
        <div className="flex justify-center">
          <Spinner />
        </div>
      )}

      {err !== null && (
        <FieldDescription className="text-center text-red-500">{err}</FieldDescription>
      )}

      <FieldSeparator>Or</FieldSeparator>

      <div className="flex flex-col gap-3">
        {step === "email" && (
          <div className="flex w-full flex-col gap-4">
            <input
              className="rounded border border-neutral-700 bg-transparent px-3 py-2 outline-none"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Button
              className="w-full"
              onClick={sendCode}
              disabled={loading || !email.trim()}
            >
              {loading ? "Sending..." : "Send code"}
            </Button>
          </div>
        )}

        {step === "code" && (
          <div className="flex w-full flex-col gap-4">
            <input
              className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2 outline-none"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
            />
            <div className="flex w-full flex-col gap-2">
              <Button
                className="w-full"
                onClick={verifyCode}
                disabled={loading || code.trim().length !== 6}
              >
                {loading ? "Checking..." : "Verify code"}
              </Button>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => setStep("email")}
                disabled={loading}
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {step === "credentials" && (
          <div className="flex w-full flex-col gap-4">
            <input
              className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2 outline-none"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <input
              className="w-full rounded border border-neutral-700 bg-transparent px-3 py-2 outline-none"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("code")}
                disabled={loading}
              >
                Back
              </Button>

              <Button
                onClick={completeSignup}
                disabled={loading || !username.trim() || !password}
              >
                {loading ? "Creating..." : "Create account"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </FieldSet>
  );
}