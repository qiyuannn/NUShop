import {} from "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import userEvent from "@testing-library/user-event";
import { useAuthStore } from "@/context/authStoreV2";
import useWebSocket from "react-use-websocket";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ChatInput } from "@/components/chat/chatInput";

vi.mock("@/context/authStoreV2", () => ({
  useAuthStore: vi.fn()
}))

vi.mock("react-use-websocket", () => ({
  default: vi.fn()
}))

describe("Chat Input", () => {
  const sendJsonMessage = vi.fn()

  beforeEach(() => {
    ;(useAuthStore as unknown as Mock).mockImplementation((s) => s({
      token: true,
      userID: "123"
    }))

    ;(useWebSocket as unknown as Mock).mockReturnValue({
      sendJsonMessage: sendJsonMessage
    })
  })

  afterEach(() => {
    vi.clearAllMocks();
    cleanup()
  })

  it("does not send a message when input is empty/only contains whitespace", async () => {
    render(
      <MemoryRouter initialEntries={["/chat/789/456"]}>
        <Routes>
          <Route path="/chat/:listingID/:otherID" element={<ChatInput/>}/>
        </Routes>
      </MemoryRouter>
    )
    const user = userEvent.setup()

    const input = screen.getByRole("textbox")
    const button = screen.getByRole('button')
    await user.type(input, " ")
    await user.click(button)

    expect(sendJsonMessage).not.toHaveBeenCalled()
  })

  it("sends the right message when user press send", async () => {
    render(
      <MemoryRouter initialEntries={["/chat/789/456"]}>
        <Routes>
          <Route path="/chat/:listingID/:otherID" element={<ChatInput/>}/>
        </Routes>
      </MemoryRouter>
    )
    const user = userEvent.setup()

    const input = screen.getByRole("textbox")
    const button = screen.getByRole('button')
    await user.type(input, "123")
    await user.click(button)

    expect(sendJsonMessage).toHaveBeenCalledWith({
      type: "message",
      message: {
        receiverID: "456",
        listingID: "789",
        content: "123"
      },
    })
  })

  it("sends the right message when user press enter", async () => {
    render(
      <MemoryRouter initialEntries={["/chat/789/456"]}>
        <Routes>
          <Route path="/chat/:listingID/:otherID" element={<ChatInput/>}/>
        </Routes>
      </MemoryRouter>
    )
    const user = userEvent.setup()

    const input = screen.getByRole("textbox")
    await user.type(input, "123")
    await user.keyboard('{Enter}')

    expect(sendJsonMessage).toHaveBeenCalledWith({
      type: "message",
      message: {
        receiverID: "456",
        listingID: "789",
        content: "123"
      },
    })
  })

  it("clears the input after a successful send", async () => {
    render(
      <MemoryRouter initialEntries={["/chat/789/456"]}>
        <Routes>
          <Route path="/chat/:listingID/:otherID" element={<ChatInput/>}/>
        </Routes>
      </MemoryRouter>
    )
    const user = userEvent.setup()

    const input = screen.getByRole("textbox")
    await user.type(input, "123")
    await user.keyboard('{Enter}')

    expect(sendJsonMessage).toHaveBeenCalledWith({
      type: "message",
      message: {
        receiverID: "456",
        listingID: "789",
        content: "123"
      },
    })

    expect(input).toHaveValue("")
  })
})