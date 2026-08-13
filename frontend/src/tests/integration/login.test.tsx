import {} from "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import { server } from "./server";
import { useAuthStore } from "@/context/authStoreV2";

describe ("login", () => {
  beforeAll(() => {
    server.listen()
  })
  beforeEach(() => {
    useAuthStore.setState({ token: null, userID: null})
  })
  afterAll(() => {
    server.close()
  })
  afterEach(() => {
    server.resetHandlers()
  })

  it("set token and userID in global context", () => {
    
  })
})