import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Item, ItemContent, ItemDescription } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import type { Category } from "@/types";
import { AlertCircleIcon, DollarSign, Trash2 } from "lucide-react";
import React, { type SetStateAction } from "react";

type FormDataType = {
  title: string;
  category: string;
  description: string;
  price: string;
  quantity: string;
  condition: string;
  files: File[];
};

export function CreateListingPage() {
  return (
    <div className="flex items-center justify-center min-w-svw">
      <div>
        <p className="text-3xl pb-4">Create your listing</p>
        <CreateListingForm />
      </div>
    </div>
  );
}

export function CreateListingForm() {
  const [formData, setFormData] = React.useState<FormDataType>({
    title: "",
    category: "",
    description: "",
    price: "",
    quantity: "",
    condition: "",
    files: [],
  });
  const [categories, setCategory] = React.useState<Category[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((p) => ({ ...p, [e.target.id]: e.target.value }));
    console.log(formData);
  };
  const handleCategoryChange = (value: string) => {
    setFormData((p) => ({ ...p, category: value }));
  };
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^[0-9]*$/.test(e.target.value)) {
      handleChange(e);
    }
  };
  const handleConditionChange = (value: string) => {
    setFormData((p) => ({ ...p, condition: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    setFormData((p) => ({ ...p, files: [...p.files, ...newFiles] }));
  };

  const apiFetch = useAuthApiFetch();
  const [err, setErr] = React.useState(false);
  const handleSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = new FormData();
    form.append("title", formData.title);
    form.append("category", formData.category);
    form.append("description", formData.description);
    form.append("price", formData.price);
    form.append("quantity", formData.quantity);
    form.append("condition", formData.condition);

    for (const file of formData.files) {
      form.append("file", file);
    }

    try {
      const res = await apiFetch("http://localhost:8080/listings", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
      }
    } catch (error) {
      setErr(true);
    }
  };

  React.useEffect(() => {
    async function fetchCategories() {
      const res = await fetch("http://localhost:8080/categories", {
        method: "GET",
      });
      const json = await res.json();
      if (res.ok) {
        setCategory(json?.data?.categories ?? []);
      }
      console.log(json.data.categories);
    }
    fetchCategories();
  }, []);

  return (
    <div className="flex justify-center items-center min-w-full">
      <div className="max-w-md">
        <CreateListingCarousel files={formData.files} setFormData={setFormData} />
        <form onSubmit={handleSubmit}>
          <FieldSet className="min-w-md">
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" value={formData.title} onChange={handleChange} required />
            </Field>
            <FieldGroup>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select onValueChange={handleCategoryChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {categories.map((category) => (
                      <SelectItem value={category.uuid} key={category.uuid}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <InputGroup>
                <InputGroupTextarea
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                />
              </InputGroup>
            </Field>
            <FieldGroup className="grid grid-cols-3">
              <Field>
                <FieldLabel htmlFor="price">Price</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    className="text-right"
                    id="price"
                    type="text"
                    value={formData.price}
                    onChange={handleNumericChange}
                    required
                  />
                  <InputGroupAddon>
                    <DollarSign />
                  </InputGroupAddon>
                  <InputGroupAddon align={"inline-end"}>.00</InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel>Quantity</FieldLabel>
                <Input
                  className="text-right"
                  id="quantity"
                  type="text"
                  value={formData.quantity}
                  onChange={handleNumericChange}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Condition</FieldLabel>
                <Select onValueChange={handleConditionChange} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      <SelectItem value="Brand new">Brand new</SelectItem>
                      <SelectItem value="Like new">Like new</SelectItem>
                      <SelectItem value="Well used">Well used</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel>Insert photos</FieldLabel>
              <Label className="border rounded-lg p-2">
                <p className="text-muted-foreground">Choose file</p>
                <Input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
              </Label>
            </Field>
            {err && (
              <Field className="flex justify-center items-center">
                <Alert className="max-w-xs" variant={"destructive"}>
                  <AlertCircleIcon />
                  <AlertTitle>Network Error</AlertTitle>
                  <AlertDescription>
                    Your listing could not be created. Please try again later.
                  </AlertDescription>
                </Alert>
              </Field>
            )}
            <Field>
              <div className="flex justify-end">
                <Button type="submit">Post</Button>
              </div>
            </Field>
          </FieldSet>
        </form>
      </div>
    </div>
  );
}

export function CreateListingCarousel({
  files,
  setFormData,
}: {
  files: File[];
  setFormData: React.Dispatch<SetStateAction<FormDataType>>;
}) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }
    api.reInit();

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api, files]);

  const handleClick = () => {
    setFormData((p) => ({
      ...p,
      files: p.files.filter((_, i) => i !== current - 1),
    }));
  };

  return (
    <div>
      <Carousel setApi={setApi} opts={{ loop: true, containScroll: false }}>
        <CarouselContent>
          {files.map((file) => (
            <CarouselItem className="basis-1/2">
              <Item>
                <ItemContent className="outline rounded-sm">
                  <img className="aspect-square object-cover" src={URL.createObjectURL(file)} />
                </ItemContent>
              </Item>
            </CarouselItem>
          ))}
          {files.length === 0 && (
            <CarouselItem className="basis-1/2">
              <Item>
                <ItemContent className="flex items-center justify-center aspect-square outline rounded-sm">
                  <ItemDescription>No photos uploaded</ItemDescription>
                </ItemContent>
              </Item>
            </CarouselItem>
          )}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      {files.length > 0 && (
        <div className="flex flex-col items-center justify-center">
          <Button variant="secondary" onClick={handleClick}>
            <Trash2 /> Remove photo
          </Button>
          <div className="py-2 text-center text-sm text-muted-foreground">
            Photo {current} of {count}
          </div>
        </div>
      )}
    </div>
  );
}
