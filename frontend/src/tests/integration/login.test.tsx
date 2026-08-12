import {} from "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
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