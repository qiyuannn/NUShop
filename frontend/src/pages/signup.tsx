import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { FieldDescription, FieldLegend, FieldSeparator, FieldSet } from "../components/ui/field";
import { Spinner } from "../components/ui/spinner";

export function SignupPage() {
  return (
    <div className="flex min-w-svw items-center justify-center min-h-svh">
      <div className="w-sm sm:w-md">
        <SignupForm />
      </div>
    </div>
  );
}

export function SignupForm() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();
  const buttonRef = React.useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [step, setStep] = React.useState<"email" | "code">("email");

  React.useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setErr("Missing VITE_GOOGLE_CLIENT_ID");
      return;
    }

    const googleWindow = window as Window & { google?: any };

    const handleCredential = async (response: { credential?: string }) => {
      if (!response.credential) {
        setErr("Missing Google credential");
        return;
      }

      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(`${API_URL}/create_user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
          credentials: "include",
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
        }

        setUser(json.data.user);
        setToken(json.data.token);
        navigate("/");
      } catch (error) {
        setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
      } finally {
        setLoading(false);
      }
    };

    const renderGoogleButton = () => {
      if (!googleWindow.google?.accounts?.id || !buttonRef.current) return;

      buttonRef.current.innerHTML = "";
      googleWindow.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
      });

      googleWindow.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signup_with",
        width: 320,
      });
    };

    if (googleWindow.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }

    if (document.getElementById("google-gsi")) {
      const existing = document.getElementById("google-gsi");
      existing?.addEventListener("load", renderGoogleButton, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.body.appendChild(script);
  }, [navigate, setToken, setUser]);

  async function sendCode() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_URL}/auth/request_code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.code ?? "INTERNAL_ERROR");

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

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.code ?? "INTERNAL_ERROR");

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
        Have an account? <Link to="/login">log in</Link>
      </FieldDescription>

      <div className="flex justify-center py-2">
        <div ref={buttonRef} />
      </div>

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
        <input
          className="rounded border border-neutral-700 bg-transparent px-3 py-2 outline-none"
          type="email"
          placeholder="yourname@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {step === "email" ? (
          <button
            type="button"
            className="rounded bg-white px-3 py-2 text-black"
            onClick={sendCode}
            disabled={loading}
          >
            Send code
          </button>
        ) : (
          <>
            <input
              className="rounded border border-neutral-700 bg-transparent px-3 py-2 outline-none"
              inputMode="numeric"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <button
              type="button"
              className="rounded bg-white px-3 py-2 text-black"
              onClick={verifyCode}
              disabled={loading}
            >
              Verify and continue
            </button>
          </>
        )}
      </div>
    </FieldSet>
  );
}