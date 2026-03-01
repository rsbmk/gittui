// src/app.tsx
// Root component — assembles the layout shell with DialogProvider

import { Show, onMount } from "solid-js"
import { DialogProvider } from "@opentui-ui/dialog/solid"
import { StatusBar } from "./ui/layout/status-bar.tsx"
import { Sidebar } from "./ui/layout/sidebar.tsx"
import { MainPanel } from "./ui/layout/main-panel.tsx"
import { KeybindingBar } from "./ui/layout/keybinding-bar.tsx"
import { GlobalKeyHandler } from "./ui/layout/global-keys.tsx"
import { sidebarVisible } from "./state/ui.ts"
import { refreshAll } from "./state/repo.ts"
import { initConfig } from "./state/config.ts"

export default function App() {
  onMount(async () => {
    await initConfig()
    refreshAll()
  })

  return (
    <DialogProvider size="medium">
      <box flexDirection="column" width="100%" height="100%">
        <StatusBar />

        <box flexDirection="row" flexGrow={1}>
          <Show when={sidebarVisible()}>
            <Sidebar />
          </Show>
          <MainPanel />
        </box>

        <KeybindingBar />
        <GlobalKeyHandler />
      </box>
    </DialogProvider>
  )
}
