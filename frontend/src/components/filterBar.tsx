import { useFilter } from "@/context/filter";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "./ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import React from "react";
import { API_URL } from "@/lib/api";
import { Separator } from "./ui/separator";
import { Item, ItemContent, ItemTitle } from "./ui/item";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { useLocation, useNavigate } from "react-router-dom";
import { RefreshCcw } from "lucide-react";

export function FilterBar() {
  return (
    <div className="flex flex-row gap-2 items-center h-12 p-2 pl-4 pr-4 w-full overflow-x-auto">
      <span className="text-muted-foreground text-sm">Filters:</span>
      <CategoryFilter />
      <Separator orientation="vertical" />
      <PriceFilter />
      <ConditionFilter />
      <ResetFilter/>
    </div>
  );
}

export function ConditionFilter() {
  const { condition, setCondition } = useFilter();

  const handleCheckedChange = (val: string, checked: boolean) => {
    if (condition.length == 2 && checked) {
      setCondition([]);
      return;
    }

    setCondition((prev: string[]) =>
      checked ? [...prev, val] : prev.filter((item) => item != val),
    );
    console.log(condition);
  };
  const handleAllChange = (checked: boolean) => {
    if (checked) {
      setCondition([]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">Condition</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <FieldSet>
          <FieldLegend variant="label">Select conditions:</FieldLegend>
          <FieldGroup className="gap-3">
            <Field orientation="horizontal">
              <Checkbox
                id="All"
                checked={condition.length == 0}
                onCheckedChange={(checked) => handleAllChange(checked == true)}
              />
              <FieldLabel htmlFor="All">All</FieldLabel>
            </Field>
            <FieldSeparator />
            <Field orientation="horizontal">
              <Checkbox
                id="Brand new"
                checked={condition.includes("Brand new")}
                onCheckedChange={(checked) => handleCheckedChange("Brand new", checked == true)}
              />
              <FieldLabel htmlFor="Brand new">Brand New</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="Like new"
                checked={condition.includes("Like new")}
                onCheckedChange={(checked) => handleCheckedChange("Like new", checked == true)}
              />
              <FieldLabel htmlFor="Like new">Like New</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="Well used"
                checked={condition.includes("Well used")}
                onCheckedChange={(checked) => handleCheckedChange("Well used", checked == true)}
              />
              <FieldLabel htmlFor="Well used">Used</FieldLabel>
            </Field>
          </FieldGroup>
        </FieldSet>
      </PopoverContent>
    </Popover>
  );
}

export function PriceFilter() {
  const { minPrice, setMinPrice, maxPrice, setMaxPrice } = useFilter();

  const handleChangeMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^[0-9]*$/.test(e.target.value)) {
      setMinPrice(e.target.value);
      if (e.target.value > maxPrice) {
        setMaxPrice(e.target.value);
      }
    }
  };
  const handleChangeMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^[0-9]*$/.test(e.target.value)) {
      //const normalized = value.replace(/^0+(?=\d)/, "");
      setMaxPrice(e.target.value);
      if (e.target.value < maxPrice) {
        setMinPrice(e.target.value);
      }
      if (Number(minPrice) == 0) {
        setMinPrice("0");
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">Price</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <FieldSet>
          <FieldLegend variant="label">Select a range</FieldLegend>
          <FieldGroup className="flex flex-row items-center">
            <Field>
              <FieldLabel>Min</FieldLabel>
              <InputGroup>
                <InputGroupAddon>S$</InputGroupAddon>
                <InputGroupInput value={minPrice} onChange={handleChangeMin} />
              </InputGroup>
            </Field>
            <span>-</span>
            <Field>
              <FieldLabel>Max</FieldLabel>
              <InputGroup>
                <InputGroupAddon>S$</InputGroupAddon>
                <InputGroupInput value={maxPrice} onChange={handleChangeMax} />
              </InputGroup>
            </Field>
          </FieldGroup>
        </FieldSet>
      </PopoverContent>
    </Popover>
  );
}

export function CategoryFilter() {
  const [Categories, setCategories] = React.useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const handleNav = (e: React.MouseEvent<HTMLButtonElement>) => {
    const q = new URLSearchParams(location.search);
    if (e.currentTarget.value == "All") {
      q.delete("category")
    } else {
      q.set("category", e.currentTarget.value);
    }

    navigate(`${location.pathname}?${q}`);
  };


  React.useEffect(() => {
    async function fetchCategories() {
      const res = await fetch(`${API_URL}/categories`, {
        method: "GET",
      });
      if (res.ok) {
        const json = await res.json();
        setCategories(json?.data?.categories ?? []);
      }
    }
    fetchCategories();
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">Categories</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Item key="All" asChild size="xs">
          <Button variant="ghost" value={"All"} onClick={handleNav}>
            <ItemContent>
              <ItemTitle className="text-muted-foreground">All</ItemTitle>
            </ItemContent>
          </Button>
        </Item>
        <FieldSeparator/>
        {Categories.filter((catergory) => catergory != "Others").map((category) => (
          <Item key={category} asChild size="xs">
            <Button variant="ghost" value={category} onClick={handleNav}>
              <ItemContent>
                <ItemTitle className="text-muted-foreground">{category}</ItemTitle>
              </ItemContent>
            </Button>
          </Item>
        ))}
        <Item key="Others" asChild size="xs">
          <Button variant="ghost" value={"Others"} onClick={handleNav}>
            <ItemContent>
              <ItemTitle className="text-muted-foreground">Others</ItemTitle>
            </ItemContent>
          </Button>
        </Item>
      </PopoverContent>
    </Popover>
  );
}

export function ResetFilter() {
  const { setMinPrice, setMaxPrice, setCondition } = useFilter()
  const location = useLocation()
  const navigate = useNavigate()
  
  const handleClick = () => {
    setMinPrice("")
    setMaxPrice("")
    setCondition([])

    const q = new URLSearchParams(location.search)
    q.delete("category")

    navigate(`${location.pathname}?${q}`)
  }

  return (
    <Button variant="outline" onClick={handleClick}>
      <RefreshCcw/>
      Reset
    </Button>
  )
}