/* prettier-ignore */
import { Route$root } from "./src/routes/__root.tsx"
import { Route$index } from "./src/routes/index.tsx"
import { Route$project } from "./src/routes/project.tsx"
import { Route$settings } from "./src/routes/settings.tsx"
import { Route$characters } from "./src/routes/characters.tsx"
import { Route$docs } from "./src/routes/docs.tsx"

export const routeTree = Route$root([Route$index(), Route$project(), Route$settings(), Route$characters(), Route$docs()])
