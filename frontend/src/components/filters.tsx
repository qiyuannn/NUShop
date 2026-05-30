import { Button } from "./ui/button";
import { Popover, PopoverTrigger } from "./ui/popover";


export function Filters() {
  return(
    <header className="flex items-center h-10 gap-2">
      <h1 className="text-muted-foreground">Filters:</h1>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Categories</Button>
        </PopoverTrigger>
      </Popover>
    </header>
  )
}