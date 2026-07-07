import { useParams, useSearchParams } from "react-router-dom";
import { SearchResults } from "./searchResults";
import type { Listing } from "@/types";
import React from "react";
import { useFilterStore } from "@/context/filterStore";
import { API_URL } from "@/lib/api";
import { Separator } from "../ui/separator";
import { FilterBar } from "../filterBar";
import { ListingsGalleryV2 } from "../listingsGalleryV2";
import { Spinner } from "../ui/spinner";
import { Button } from "../ui/button";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";

export function NormalResults({isManaging}: {isManaging: boolean}) {
  const [params] = useSearchParams()
  const { userID } = useParams()
  const category = params.get("category")
  const search = params.get("search")
  const authApiFetch = useAuthApiFetch()

  const [listings, setListings] = React.useState<Listing[]>([])
  const [cursor, setCursor] = React.useState<{
    cursorID: string
    cursorTime: string
    hasMore: boolean
  }|null>(null)
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string|null>(null)

  const { minPrice, maxPrice, condition } = useFilterStore()

  const handleLoadMore = async () => {
    const searchParams = new URLSearchParams()
    if (minPrice != "") {
      searchParams.set("minPrice", minPrice)
    }
    if (maxPrice != "") {
      searchParams.set("maxPrice", maxPrice)
    }
    condition.forEach((condition) => searchParams.append("condition", condition))
    const category = params.get("category")
    if (category != null) {
      searchParams.set("category", category)
    }
    if (userID != null) {
      searchParams.set("sellerID", userID)
    }
    if (cursor && cursor.hasMore && cursor.cursorID && cursor.cursorTime) {
      searchParams.set("cursorID", cursor.cursorID)
      searchParams.set("cursorTime", cursor.cursorTime)
    }

    try {
      const res = await ( !isManaging
        ? fetch(`${API_URL}/listings${searchParams.toString() ? `?${searchParams.toString()}`: ``}`)
        : authApiFetch(`${API_URL}/listings/manage${searchParams.toString() ? `?${searchParams.toString()}`: ``}`)
      )
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error?.code ?? "INTERNAL_ERROR")
      }
      setListings((p) => [...p, ...(json?.data?.listings ?? [])])
      setCursor(json?.data?.cursor ?? null)
    } catch (error) {
      setErr(error instanceof Error ? error.message : "INTERNAL_ERROR")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (search) { return }
    setLoading(true)
    setErr(null)

    async function fetchListings() {
      const searchParams = new URLSearchParams()
      if (minPrice != "") {
        searchParams.set("min_price", minPrice)
      }
      if (maxPrice != "") {
        searchParams.set("max_price", maxPrice)
      }
      condition.forEach((condition) => searchParams.append("condition", condition))
      const category = params.get("category")
      if (category != null) {
        searchParams.set("category", category)
      }
      if (userID != null) {
        searchParams.set("sellerID", userID)
      }

      try {
        const res = await ( !isManaging
          ? fetch(`${API_URL}/listings${searchParams.toString() ? `?${searchParams.toString()}`: ``}`)
          : authApiFetch(`${API_URL}/listings/manage${searchParams.toString() ? `?${searchParams.toString()}`: ``}`)
        )
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR")
        }
        setListings(json?.data?.listings ?? [])
        setCursor(json?.data?.cursor ?? null)
      } catch (error) {
        setErr(error instanceof Error ? error.message : "INTERNAL_ERROR")
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [params, minPrice, maxPrice, condition])

  if (search) {
    return <SearchResults isManaging={isManaging}/>
  }

  return(
    <div className="flex flex-col h-full w-full">
      { category && 
        <>
          <div className="p-2 pl-4">
            <span>Showing results in </span>
            <span className="font-bold">{category}</span>
          </div>
          <Separator/>
        </>
      }
      <FilterBar/>
      <Separator/>
      <div className="flex-1">
        { !loading && !err &&
          <ListingsGalleryV2 listings={listings} setListings={setListings} isManaging={isManaging}/>
        }
        { loading && 
          <div className="h-full w-full flex items-center justify-center">
            <Spinner/>
          </div>
        }
        { err && 
          <div className="h-full w-full flex items-center justify-center">
            <p className="font-bold">Network error</p>
          </div>
        }
      </div>
      { cursor?.hasMore && listings.length !== 0 &&
        <div className="self-center p-2">
          <Button onClick={handleLoadMore}>Load More</Button>
        </div>
      }
      { !cursor?.hasMore && listings.length !== 0 && !err &&
        <div className="self-center p-2">
          <p className="font-bold">End of listings</p>
        </div>
      }
    </div>
  )
}