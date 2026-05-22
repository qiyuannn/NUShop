import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { BsShop } from "react-icons/bs";

export default function LoginPage() {
    return (
        <div className="flex justify-center items-center min-h-svh bg-muted p-6 md:p-10">
            <div className="flex flex-col max-w-sm w-full gap-4">
                <Link className="flex justify-center items-center gap-1" to="#">
                    <div className="rounded-md bg-primary text-primary-foreground">
                        <BsShop className="size-6"/>
                    </div>
                    <p>NUShop</p>
                </Link>
                <LoginForm/>
            </div>
        </div>
    )
}


export function LoginForm() {
    const [formData, setFormData] = React.useState({
        email: "",
        password: ""
    })
    const [passwordVisible, setPasswordVisible] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [err, setErr] = React.useState<string|null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({...prev, [e.target.id]: e.target.value}))
    }

    const handleSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setErr(null)

        try {
            const res = await fetch("http://localhost:8080/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData)
            })
            const json = await res.json()
            if (!res.ok) {
                throw new Error(json?.error?.message ?? "failed to get user")
            }
        } catch (err) {
            setErr(err instanceof Error? err.message: "something went wrong idk")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-xl font-bold">Welcome back</CardTitle>
                <CardDescription>Login to your NUShop account</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input className="placeholder:text-xs text-xs" id="email" type="email" placeholder="m@example.com" value={formData.email} onChange={handleChange} required/>
                        </Field>
                        <Field>
                            <div className="flex items-center">
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <Link to="/forgot-password" className="ml-auto text-xs underline-offset-2 hover:underline">Forgot password?</Link>
                            </div>
                            <InputGroup>
                                <InputGroupInput className="text-xs" id="password" type={passwordVisible?"text": "password"} value={formData.password} onChange={handleChange} required/>
                                <InputGroupAddon align="inline-end" onClick={()=>setPasswordVisible(!passwordVisible)}>
                                    {passwordVisible? <EyeIcon/> : <EyeOffIcon/>}
                                </InputGroupAddon>
                            </InputGroup>
                        </Field>
                        <Field>
                            <Button className="font-normal" disabled={loading}>
                                {loading? <Spinner/>: "Login"}
                            </Button>
                            {err !== null? 
                                <FieldDescription>
                                    {err === "unauthorised"
                                        ? "wrong username/password"
                                        : "Something went wrong. Please try again"
                                    }
                                </FieldDescription>
                                :null
                            }
                        </Field>
                    </FieldGroup>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center">
                <CardDescription className="flex text-center"> 
                    <p>Don't have an account? <Link to="/signup" className="underline underline-offset-2">Sign up</Link></p>
                </CardDescription>
            </CardFooter>
        </Card>
    )
}