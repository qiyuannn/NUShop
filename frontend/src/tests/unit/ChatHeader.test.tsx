import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";
import { ChatHeader } from "@/components/chat/chatHeader";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/hooks/use-authApiFetch", () => ({
  useAuthApiFetch: vi.fn()
}))

describe("Chat header", () => {
  const mockAuthApiFetch = vi.fn()

  beforeEach(() => {
    vi.mocked(useAuthApiFetch).mockReturnValue(mockAuthApiFetch)

    mockAuthApiFetch.mockResolvedValue({
      ok: true,
      json: async() => ({
        data: {
          title: "testTitle",
          otherName: "testOtherName",
          image: "testImage.png"
        },
      }),
    } as Response)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("Renders all chat info", async () => {
    render(
      <MemoryRouter initialEntries={["/chat/123/456"]}>
        <Routes>
          <Route path="/chat/:listingID/:otherID" element={<ChatHeader/>}/>
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('testTitle')).toBeInTheDocument()
    expect(await screen.findByText('testOtherName')).toBeInTheDocument()
  })
})