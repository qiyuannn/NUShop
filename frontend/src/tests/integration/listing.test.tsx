import {} from "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

describe("listing", () => {
  beforeAll(() => {
    server.listen()
  })
  beforeEach(() => {
    useAuthStore.setState({ token: "token", userID: "user"})
  })
  afterAll(() => {
    server.close()
  })
  afterEach(() => {
    server.resetHandlers()
  })

  it("Success - renders all listings correctly", () => {
    
  })
})