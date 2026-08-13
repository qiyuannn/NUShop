import {} from "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import { server } from "./server";
import { useAuthStore } from "@/context/authStoreV2";

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