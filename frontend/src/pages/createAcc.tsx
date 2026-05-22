import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import React from "react";
import { BsShop } from "react-icons/bs";
import { Link } from "react-router-dom";

export default function SignUpPage() {
    return (
        <div className="flex items-center justify-center min-h-svh bg-muted p-6 md:p-10">
            <div className="flex flex-col max-w-sm w-full gap-4">
                            <Link className="flex justify-center items-center gap-1" to="#">
                                <div className="rounded-md bg-primary text-primary-foreground">
                                    <BsShop className="size-6"/>
                                </div>
                                <p>NUShop</p>
                            </Link>
                <SignUpForm/>
            </div>
        </div>
    )
}

export function SignUpForm() {
    const [passwordVisible, setPasswordVisible] = React.useState(false)
    const [formData, setFormData] = React.useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    })
    const [loading, setLoading] = React.useState(false)
    const [passwordErr, setPasswordErr] = React.useState<string|null>(null)
    const [serverErr, setServerErr] = React.useState<string|null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({...prev, [e.target.id]: e.target.value}))
    }

    const handleSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setPasswordErr(null)
        setServerErr(null)

        if (formData.password !== formData.confirmPassword) {
            setPasswordErr("Passwords must match")
            setLoading(false)
            return
        } else if (formData.password.length < 8) {
            setPasswordErr("Password must contain at least 8 character")
            setLoading(false)
            return
        }

        const {confirmPassword, ...body} = formData

        try {
            const res = await fetch("http://localhost:8080/create_user", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(body)
            })

            const json = await res.json()
            if (!res.ok) {
                throw new Error(json?.error?.code ?? "INTERNAL_ERROR")
            }
        } catch (err) {
            setServerErr(err instanceof Error? err.message: "INTERNAL_ERROR")
        } finally {
            setLoading(false)
        }
    }

    return(
        <Card className="gap-6">
            <CardHeader className="text-center">
                <CardTitle className="text-xl font-bold">Create your account</CardTitle>
                <CardDescription>Enter your details below to create your account</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <FieldSet>
                        <FieldGroup className="grid grid-cols-2">
                            <Field>
                                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                                <Input className="placeholder:text-xs text-xs" id="firstName" type="text" placeholder="John" value={formData.firstName} onChange={handleChange} required/>
                            </Field>
                            <Field>
                                <FieldLabel>Last name</FieldLabel>
                                <Input className="placeholder:text-xs text-xs" id="lastName" type="text" placeholder="tan" value={formData.lastName} onChange={handleChange} required/>
                            </Field>
                        </FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input className="placeholder:text-xs text-xs" id="email" type="email" placeholder="m@example.com" value={formData.email} onChange={handleChange} required/>
                        </Field>
                        <FieldGroup>
                            <Field data-invalid={passwordErr !== null}>
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <InputGroup>
                                    <InputGroupInput className="text-xs" id="password" type={passwordVisible?"text": "password"} value={formData.password} onChange={handleChange} aria-invalid={passwordErr !== null} required/>
                                    <InputGroupAddon onClick={() => setPasswordVisible(!passwordVisible)} align="inline-end">
                                        {passwordVisible? <EyeIcon/>: <EyeOffIcon/>}
                                    </InputGroupAddon>
                                </InputGroup>
                                {passwordErr !== null? <FieldDescription className="text-destructive">*{passwordErr}</FieldDescription>: null}
                            </Field>
                            <Field data-invalid={passwordErr !== null}>
                                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                                <InputGroup>
                                    <InputGroupInput className="text-xs" id="confirmPassword" type={passwordVisible?"text": "password"} value={formData.confirmPassword} onChange={handleChange} aria-invalid={passwordErr !== null} required/>
                                    <InputGroupAddon onClick={() => setPasswordVisible(!passwordVisible)} align="inline-end">
                                        {passwordVisible? <EyeIcon/>: <EyeOffIcon/>}
                                    </InputGroupAddon>
                                </InputGroup>
                                {passwordErr !== null? <FieldDescription className="text-destructive">*{passwordErr}</FieldDescription>: null}
                            </Field>
                            <FieldDescription>Password must be at least 8 characters long</FieldDescription>
                        </FieldGroup>
                        <Field>
                            <Button className="w-full font-normal" type="submit" disabled={loading}>
                                {loading?<Spinner/>: "Create account"}
                            </Button>
                            {serverErr === "STATUS_CONFLICT" &&
                                <FieldDescription className="text-center">Email alerady in use.</FieldDescription>
                            }
                            {serverErr === "INTERNAL_ERROR" &&
                                <FieldDescription className="text-center">Something went wrong. Please try again.</FieldDescription>
                            }
                        </Field>
                    </FieldSet>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center">
                <FieldDescription className="text-center">
                    Already have an account? <Link to="/login" className="underline underline-offset-2">login here</Link>
                </FieldDescription>
            </CardFooter>
        </Card>
    )
}