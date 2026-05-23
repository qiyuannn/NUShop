import { Link, useNavigate } from "react-router-dom";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "../components/ui/field";
import { InputGroup, InputGroupButton, InputGroupInput } from "../components/ui/input-group";
import { Input } from "../components/ui/input";
import React from "react";
import { EyeIcon, EyeOffIcon, ShoppingBag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Spinner } from "../components/ui/spinner";
import { useAuth } from "@/context/auth";

export function LoginPage() {
    return(
        <div className="flex justify-center items-center min-h-svh min-w-svw">
            <div className="w-full max-w-sm">
                <LoginForm/>
            </div>
        </div>
    )
}

export function LoginForm() {
    const [passwordVisible, setPasswordVisible] = React.useState(false)
    const [formData, setFormData] = React.useState({
        email: "",
        password: "",
    })
    const [loading, setLoading] = React.useState(false)
    const [err, setErr] = React.useState<string|null>(null)
    const {setUser, setToken} = useAuth();
    const nav = useNavigate()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((p)=>({...p, [e.target.id]: e.target.value}))
    }

    const handleSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setErr(null)

        try{
            const res = await fetch("http://localhost:8080/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData)
            })
            const json = await res.json()
            if (!res.ok) {
                console.log()
                throw new Error(json?.error?.code ?? "INTERNAL_ERROR")
            } 
            setUser(json.data.user)
            setToken(json.data.token)
            nav("/")
        } catch (err) {
            setErr(err instanceof Error? err.message: "INTERNAL_ERROR")
        } finally {
            setLoading(false)
        }
    }

    return(
        <form onSubmit={handleSubmit}>
            <FieldSet>
                <FieldLegend className="text-center font-semibold flex flex-col items-center gap-2">
                    <Link to=""><ShoppingBag/></Link>
                    <p>Welcome to NUShop</p>
                </FieldLegend>
                <FieldDescription className="text-center">
                    Don't have an account? <Link to="/signup">Sign up</Link>
                </FieldDescription>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input id="email" type="email" placeholder="abc@xyz.com" value={formData.email} onChange={handleChange} required></Input>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <InputGroup>
                            <InputGroupInput id="password" type={passwordVisible? "text": "password"} value={formData.password} onChange={handleChange} required/>
                            <InputGroupButton onClick={()=>setPasswordVisible(!passwordVisible)}>
                                {passwordVisible? <EyeIcon/>: <EyeOffIcon/>}
                            </InputGroupButton>
                        </InputGroup>
                    </Field>
                    {err === "UNAUTHORISED" &&
                        <FieldDescription className="text-center">Wrong username/password</FieldDescription>
                    }
                    {err !== null && err !== "UNAUTHORISED" &&
                        <FieldDescription className="text-center">Network error. Please try again</FieldDescription>
                    }
                    <Field>
                        <Button type="submit">
                            {loading? <Spinner/>: "Login"}
                        </Button>
                    </Field>
                </FieldGroup>
                <FieldSeparator>Or</FieldSeparator>
                <FieldDescription className="text-center">
                    <Link to="/">Continue as guest</Link>
                </FieldDescription>
            </FieldSet>
        </form>
    )
}