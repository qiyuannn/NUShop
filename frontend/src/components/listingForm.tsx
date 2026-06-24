import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { API_URL } from "@/lib/api";
import { AlertCircleIcon, DollarSign, Trash2 } from "lucide-react";
import React, { type SetStateAction } from "react";
import { useNavigate, useParams } from "react-router-dom";

type FormDataType = {
  title: string;
  category: string;
  description: string;
  price: string;
  quantity: string;
  condition: string;
  files: (File | string)[];
};

export function ListingForm({ typeCreate }: { typeCreate: boolean }) {
  const navigate = useNavigate();
  const { listingID } = useParams();
  const [categories, setCategory] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<FormDataType>({
    title: "",
    category: "",
    description: "",
    price: "",
    quantity: "",
    condition: "",
    files: [],
  });
  const [err, setErr] = React.useState(false);
  const apiFetch = useAuthApiFetch();

  React.useEffect(() => {
    if (!listingID) return;
    async function fetchListing() {
      const res = await apiFetch(`${API_URL}/listings/${listingID}`);
      const json = await res.json();
      if (!res.ok) {
        setErr(true);
        return;
      }
      console.log("category from API:", json.data.listing.categoryName);
      setFormData({
        title: json.data.listing.title ?? "",
        category: (json.data.listing.categoryName ?? "").trim(),
        description: json.data.listing.description ?? "",
        price: String(json.data.listing.price ?? ""),
        quantity: String(json.data.listing.quantity ?? ""),
        condition: json.data.listing.condition ?? "",
        files: json.data.listing.images ?? [],
      });
    }
    fetchListing();
  }, [listingID]);

  React.useEffect(() => {
    async function fetchCategories() {
      const res = await fetch(`${API_URL}/categories`, {
        method: "GET",
      });
      const json = await res.json();
      if (res.ok) {
        setCategory(json?.data?.categories ?? []);
      }
    }
    fetchCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((p) => ({ ...p, [e.target.id]: e.target.value }));
  };

  const [titleLen, setTitleLen] = React.useState(0);
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length < 50) {
      setFormData((p) => ({ ...p, title: e.target.value }));
    }
    setTitleLen(e.target.value.length);
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

  const handleSubmit = async (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    const form = new FormData();
    form.append("title", formData.title);
    form.append("category", formData.category);
    form.append("description", formData.description);
    form.append("price", formData.price);
    form.append("quantity", formData.quantity);
    form.append("condition", formData.condition);

    if (!typeCreate) {
      form.append(
        "retained_images",
        JSON.stringify(formData.files.filter((f): f is string => typeof f === "string")),
      );
    }

    for (const file of formData.files) {
      if (file instanceof File) {
        form.append("file", file);
      }
    }

    try {
      const res = await apiFetch(
        !typeCreate ? `${API_URL}/listings/${listingID}` : `${API_URL}/listings`,
        {
          method: typeCreate ? "POST" : "PUT",
          body: form,
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.code ?? "INTERNAL_ERROR");
      }

      navigate("/listings/manage");
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="ring-0">
      <div className="sm:pl-16 sm:pr-16">
        <ListingFormCarousel files={formData.files} setFormData={setFormData} />
      </div>
      <CardContent className="sm:pl-16 sm:pr-16">
        <form onSubmit={handleSubmit}>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  required
                />
                <InputGroupAddon align="inline-end">{titleLen}/50</InputGroupAddon>
              </InputGroup>
            </Field>
            <FieldGroup>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select
                  key={categories.join("|")}
                  value={formData.category.trim()}
                  onValueChange={handleCategoryChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {categories.map((category) => (
                      <SelectItem value={category.trim()} key={category}>
                        {category}
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
                  className="w-full min-w-0 text-wrap break-all"
                />
              </InputGroup>
            </Field>
            <FieldGroup className="grid sm:grid-cols-3">
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
                <Select value={formData.condition} onValueChange={handleConditionChange} required>
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
                    {" "}
                    {typeCreate
                      ? "Your listing could not be created. Please try again later."
                      : "Your listing could not be created. Please try again later."}
                  </AlertDescription>
                </Alert>
              </Field>
            )}
            <Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "Posting..." : !typeCreate ? "Save changes" : "Post"}
                </Button>
              </div>
            </Field>
          </FieldSet>
        </form>
      </CardContent>
    </Card>
  );
}

export function ListingFormCarousel({
  files,
  setFormData,
}: {
  files: (File | string)[];
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
    <div className="w-full">
      <Carousel setApi={setApi} opts={{ loop: true, containScroll: false }}>
        <CarouselContent>
          {files.map((file, index) => (
            <CarouselItem
              key={typeof file === "string" ? `${file}-${index}` : `${file.name}-${index}`}
              className="basis-4/5 md:basis-1/2 lg:basis-2/7 pl-0"
            >
              <Item>
                <ItemContent className="border rounded-sm">
                  <img
                    className="aspect-square w-full h-auto object-cover rounded-lg"
                    src={
                      typeof file === "string"
                        ? file.startsWith("http")
                          ? file
                          : `${API_URL}${file}`
                        : URL.createObjectURL(file)
                    }
                  />
                </ItemContent>
              </Item>
            </CarouselItem>
          ))}
          {files.length === 0 && (
            <CarouselItem className="basis-4/5 md:basis-1/2 lg:basis-2/7 pl-0">
              <Item>
                <ItemContent className="flex items-center justify-center aspect-square border rounded-sm">
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
