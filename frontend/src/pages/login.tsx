import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/context/auth";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../components/ui/field";
import { Spinner } from "../components/ui/spinner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

type LoginStep = "password" | "code";

export function LoginPage() {
  return (
    <div className="flex min-h-svh min-w-svw items-center justify-center">
      <div className="w-sm sm:w-md">
        <LoginForm />
      </div>
    </div>
  );
}

export function LoginForm() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<LoginStep>("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  React.useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  }, [step]);

  function handleTryAgain() {
    setErr(null);
    setStep("password");
    setCode("");
    setLoading(false);
  }

  async function sendLoginCode(loginEmail: string) {
    const res = await fetch(`${API_URL}/auth/request_code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: loginEmail, flow: "login" }),
    });

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};

    if (!res.ok) {
      throw new Error(
        json?.error?.message ??
        json?.message ??
        json?.error ??
        json?.error?.code ??
        "INTERNAL_ERROR",
      );
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(
          json?.error?.message ??
          json?.message ??
          json?.error ??
          json?.error?.code ??
          "INTERNAL_ERROR",
        );
      }

      await sendLoginCode(email.trim());
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
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(
          json?.error?.message ??
          json?.message ??
          json?.error ??
          json?.error?.code ??
          "INTERNAL_ERROR",
        );
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
        <Link to="">
          <ShoppingBag />
        </Link>
        <p>Welcome to NUShop</p>
      </FieldLegend>

      <FieldDescription className="text-center">
        Don&apos;t have an account? <Link to="/signup">Sign up</Link>
      </FieldDescription>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            try {
              setLoading(true);
              setErr(null);

              const credential = credentialResponse.credential;
              if (!credential) {
                throw new Error("Missing Google credential");
              }

              const res = await fetch(`${API_URL}/auth/google_login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ credential }),
              });

              const text = await res.text();
              const json = text ? JSON.parse(text) : {};

              if (!res.ok) {
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
          }}
          onError={() => setErr("Google sign-in failed")}
        />
      </div>

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
        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="contents">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>

            <Field>
              <Button type="submit" disabled={loading || !email.trim() || !password.trim()}>
                {loading ? "Checking..." : "Login"}
              </Button>
            </Field>
          </form>
        )}

        {step === "code" && (
          <>
            <Field>
              <FieldLabel htmlFor="code">6-digit verification code</FieldLabel>
              <Input
                id="code"
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
                onClick={verifyCode}
                disabled={loading || code.trim().length !== 6}
              >
                {loading ? "Verifying..." : "Verify code"}
              </Button>
            </Field>

            <Field>
              <Button type="button" variant="outline" onClick={() => setStep("password")}>
                Back
              </Button>
            </Field>
          </>
        )}
      </FieldGroup>

      <FieldDescription className="text-center">
        <Link to="/">Continue as guest</Link>
      </FieldDescription>
    </FieldSet>
  );
}
