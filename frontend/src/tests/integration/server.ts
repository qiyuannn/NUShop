import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { API_URL } from '@/lib/api'

const handlers = [
  http.post(`${API_URL}/auth/refresh`, () => {
    return HttpResponse.json({
      data: {
        token: "new token",
        user: "user"
      }
    }, { status: 200 })
  })
]

export const server = setupServer(...handlers)

