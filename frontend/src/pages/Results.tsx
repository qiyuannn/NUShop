import { SearchResultsV2 } from "@/components/search/searchResultsV2";
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function Results() {
  const [params] = useSearchParams();
  const nav = useNavigate();

  React.useEffect(() => {
    if (params.size == 0) {
      nav("/");
    }
  }, [params]);

  return <SearchResultsV2 isManaging={false} />;
}
