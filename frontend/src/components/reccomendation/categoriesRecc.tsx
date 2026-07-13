import { Separator } from "../ui/separator"
import { PersonalisedRecc } from "./personalisedRecc"

export function TestReccPage() {
  return (
    <div>
      <PersonalisedRecc/>
      <CategoriesRecc/>
    </div>
  )
}


export function CategoriesRecc() {
  return (
    <div>
      <div className="pl-4">
        <p className="font-bold text-xl">Trending</p>
      </div>
    </div>
  )
}