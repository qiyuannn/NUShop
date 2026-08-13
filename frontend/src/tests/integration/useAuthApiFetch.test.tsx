import {} from "@testing-library/jest-dom/vitest";
import { renderHook } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { server } from "./server";
import { http, HttpResponse } from "msw";
import { useAuthStore } from "@/context/authStoreV2";
import { useAuthApiFetch } from "@/hooks/use-authApiFetch";

describe("useAuthApiFetch", () => {
  beforeAll(() => {
    // initialising server + set up api responses
    server.listen()
  })
  beforeEach(() => {
    // seed state required for testing
    useAuthStore.setState({ token: "old token", userID: "user" })
  })
  afterEach(() => {
    // reset handlers to their default state
    server.resetHandlers()
  })
  afterAll(() => {
    // stop msw server
    server.close()
  })

  it("does not refresh token when request succeeds", async () => {
    // configure api response specific to this test case
    server.use(
      http.get("/test", () => {
        return HttpResponse.json(null, { status: 200 })
      })
    )

    // render component to be tested
    const { result } = renderHook(() => useAuthApiFetch())
    const authApiFetch = result.current
    const response = await authApiFetch("/test")

    // assert result
    expect(response.status).toBe(200)
    expect(useAuthStore.getState().token).toBe('old token')
  })

  it("Simulate invalid token - return unauthorised and call auth/refresh api + rerun initial fetch request again", async () => {
    let testCall = 0

    server.use(
      http.get("/test", () => {
        testCall += 1
        if (testCall == 1) {
          return HttpResponse.json(null, {
            status: 401
          })
        }
        return HttpResponse.json(null, { status: 200 })
      })
    )

    const { result } = renderHook(() => useAuthApiFetch())
    const authApiFetch = result.current
    
    const response = await authApiFetch("/test")
    expect(response.status).toBe(200)
    expect(useAuthStore.getState().token).toBe('new token')
  })

  it("Simulate internal err - return internal error not call auth/refresh", async () => {


    server.use(
      http.get("/test", () => {
          return HttpResponse.json(null, {
            status: 400
          })
      })
    )

    const { result } = renderHook(() => useAuthApiFetch())
    const authApiFetch = result.current
    
    const response = await authApiFetch("/test")
    expect(response.status).toBe(400)
    expect(useAuthStore.getState().token).toBe('old token')
  })
})