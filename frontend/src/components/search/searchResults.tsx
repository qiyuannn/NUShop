import { FilterBar } from "@/components/filterBar"
import { ListingsGalleryV2 } from "@/components/listingsGalleryV2"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useFilterStore } from "@/context/filterStore"
import { API_URL } from "@/lib/api"
import type { Listing } from "@/types"
import React from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Spinner } from "../ui/spinner"
import { NormalResults } from "./normalResults"
import { useAuthApiFetch } from "@/hooks/use-authApiFetch"


export function SearchResults({isManaging} : {isManaging: boolean}) {
  const [params] = useSearchParams()
  const category = params.get("category")
  const search = params.get("search")
  const authApiFetch = useAuthApiFetch()
  const { userID } = useParams()

  const [listings, setListings] = React.useState<Listing[]>([])
  const [cursor, setCursor] = React.useState<{
    cursorRank: number
    cursorID: string
    hasMore: boolean
  }| null>(null)
  const [err, setErr] = React.useState<string|null>(null)
  const [loading, setLoading] = React.useState(false)

  const { minPrice, maxPrice, condition } = useFilterStore()
  
  const handleLoadMore = async () => {
    const searchParams = new URLSearchParams()
    searchParams.set("search", search!)
    if (minPrice != "") {
      searchParams.set("min_price", minPrice)
    }
    if (maxPrice != "") {
      searchParams.set("max_price", maxPrice)
    }
    condition.forEach((condition) => searchParams.append("condition", condition))
    if (category != null) {
      searchParams.set("category", category)
    }
    if (userID != null) {
      searchParams.set("sellerID", userID)
    }
    if (cursor != null && cursor.hasMore && cursor.cursorRank && cursor.cursorID) {
      searchParams.set("cursorRank", cursor.cursorRank.toString())
      searchParams.set("cursorID", cursor.cursorID)
    }

    try {
      const res = await ( !isManaging
        ? fetch(`${API_URL}/listings/search${searchParams.toString() ? `?${searchParams.toString()}`: ""}`)
        : authApiFetch(`${API_URL}/listings/manage/search${searchParams.toString() ? `?${searchParams.toString()}`: ""}`)
      )
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error?.code ?? "INTERNAL_ERROR")
      }
      setListings((p) => [...p, ...(json?.data?.listings ?? [])])
      setCursor(json?.data?.cursor ?? null)
    } catch {
      toast.error("failed to fetch new listings")
    }
  }

  React.useEffect(() => {
    if (!search) { return }
    setLoading(true)
    setErr(null)

    async function fetchListings() {
      const searchParams = new URLSearchParams()
      searchParams.set("search", search!)
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
          ? fetch(`${API_URL}/listings/search${searchParams.toString() ? `?${searchParams.toString()}`: ""}`)
          : authApiFetch(`${API_URL}/listings/manage/search${searchParams.toString() ? `?${searchParams.toString()}`: ""}`)
        )
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.error?.code ?? "INTERNAL_ERROR")
        }
        setListings(json?.data?.listings ?? [])
        setCursor(json?.data?.cursor ?? null)
      } catch (error) {
        setErr(error instanceof Error ? error.message : "INERNAL_ERROR")
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [params, minPrice, maxPrice, condition])

  if (!search) {
    return <NormalResults isManaging={isManaging}/>
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-2 pl-4">
        <span>Showing results for </span>
        <span className="font-bold">{search} </span>
        { category && 
          <>
            <span>in </span>
            <span className="font-bold">{category}</span>
          </>
        }
      </div>
      <Separator/>
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