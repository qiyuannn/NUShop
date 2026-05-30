import { Link } from "react-router-dom";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../components/ui/field";
import { EyeIcon, EyeOffIcon, ShoppingBag } from "lucide-react";
import { Input } from "../components/ui/input";
import { InputGroup, InputGroupButton, InputGroupInput } from "../components/ui/input-group";
import React from "react";
import { Button } from "../components/ui/button";
import { Spinner } from "../components/ui/spinner";
import { API_URL } from "@/lib/api";

export function SignupPage() {
  return (
    <div className="flex min-w-svw justify-center items-center min-h-svh">
      <div className="min-w-md">
        <SignupForm />
      </div>
    </div>
  );
}

export function SignupForm() {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [passErr, setPassErr] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({ ...p, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setPassErr(null);

    if (formData.confirmPassword != formData.password) {
      setPassErr("Passwords must match");
      setLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      setPassErr("Password must have at least 8 characters");
      setLoading(false);
      return;
    }

    const { confirmPassword, ...body } = formData;

    try {
      const res = await fetch(`${API_URL}/create_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : "INTERNAL_ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldSet>
        <FieldLegend className="text-center flex flex-col items-center gap-2 font-semibold">
          <Link className="flex gap-1 font-bold" to="">
            <ShoppingBag />
            <p>NUShop</p>
          </Link>
          <p>Create your account</p>
        </FieldLegend>
        <FieldDescription className="text-center">
          Have an account? <Link to="/login">log in</Link>
        </FieldDescription>
        <FieldGroup className="grid grid-cols-2">
          <Field>
            <FieldLabel htmlFor="firstName">First name</FieldLabel>
            <Input
              id="firstName"
              type="text"
              placeholder="Joe"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="lastName">Last name</FieldLabel>
            <Input
              id="lastName"
              type="text"
              placeholder="Tan"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </Field>
        </FieldGroup>
        <Field data-invalid={err === "STATUS_CONFLICT"}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="abc@xyz.com"
            value={formData.email}
            onChange={handleChange}
            aria-invalid={err === "STATUS_CONFLICT"}
            required
          />
        </Field>
        <FieldGroup>
          <Field data-invalid={passErr !== null}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="password"
                type={passwordVisible ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                aria-invalid={passErr !== null}
                required
              />
              <InputGroupButton onClick={() => setPasswordVisible(!passwordVisible)}>
                {passwordVisible ? <EyeIcon /> : <EyeOffIcon />}
              </InputGroupButton>
            </InputGroup>
          </Field>
          <FieldDescription>Password must be at least 8 characters long</FieldDescription>
          <Field data-invalid={passErr !== null}>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="confirmPassword"
                type={passwordVisible ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                aria-invalid={passErr !== null}
                required
              />
              <InputGroupButton onClick={() => setPasswordVisible(!passwordVisible)}>
                {passwordVisible ? <EyeIcon /> : <EyeOffIcon />}
              </InputGroupButton>
            </InputGroup>
          </Field>
        </FieldGroup>
        <Field>
          {passErr !== null && (
            <FieldDescription className="text-center">{passErr}</FieldDescription>
          )}
          {err === "STATUS_CONFLICT" && (
            <FieldDescription className="text-center">Email already in use</FieldDescription>
          )}
          {err !== "STATUS_CONFLICT" && err !== null && (
            <FieldDescription className="text-center">
              Network error. Please try again
            </FieldDescription>
          )}
        </Field>
        <Field>
          <Button type="submit">{loading ? <Spinner /> : "Create account"}</Button>
        </Field>
        <FieldSeparator>Or</FieldSeparator>
        <FieldDescription className="text-center">
          <Link to="/">Continue as guest</Link>
        </FieldDescription>
      </FieldSet>
    </form>
  );
}
