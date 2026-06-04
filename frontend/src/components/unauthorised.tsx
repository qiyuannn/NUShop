import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export function Unauthorised() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <p className="text-xl font-bold">Unauthorised</p>
      <p className="text-muted-foreground">You are not supposed to be here.</p>
      <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
        Return home.
      </Button>
    </div>
  );
}
