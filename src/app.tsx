// src/app.tsx
// Root component — assembles the layout shell with DialogProvider

import { Show, onMount } from "solid-js"
import { DialogProvider } from "@opentui-ui/dialog/solid"
import { StatusBar } from "./ui/layout/status-bar.tsx"
import { Sidebar } from "./ui/layout/sidebar.tsx"
import { MainPanel } from "./ui/layout/main-panel.tsx"
import { KeybindingBar } from "./ui/layout/keybinding-bar.tsx"
import { GlobalKeyHandler } from "./ui/layout/global-keys.tsx"
import { HelpOverlay } from "./ui/layout/help-overlay.tsx"
import { CommandPalette } from "./ui/layout/command-palette.tsx"
import {
  sidebarVisible,
  helpOverlayOpen,
  setHelpOverlayOpen,
  commandPaletteOpen,
  setCommandPaletteOpen,
} from "./state/ui.ts"
import { refreshAll } from "./state/repo.ts"
import { initConfig } from "./state/config.ts"

export default function App() {
  onMount(async () => {
    await initConfig()
    refreshAll()
  })

  return (
    <DialogProvider size="medium">
      <box position="relative" width="100%" height="100%">
        {/* Main layout */}
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

        {/* Overlays — absolute positioned above main content */}
        <Show when={helpOverlayOpen()}>
          <box
            position="absolute"
            left={0}
            top={0}
            width="100%"
            height="100%"
            zIndex={10}
            justifyContent="center"
            alignItems="center"
          >
            <HelpOverlay
              visible={helpOverlayOpen()}
              onClose={() => setHelpOverlayOpen(false)}
            />
          </box>
        </Show>

        <Show when={commandPaletteOpen()}>
          <box
            position="absolute"
            left={0}
            top={0}
            width="100%"
            height="100%"
            zIndex={10}
            justifyContent="center"
            alignItems="center"
          >
            <CommandPalette
              visible={commandPaletteOpen()}
              onClose={() => setCommandPaletteOpen(false)}
            />
          </box>
        </Show>
      </box>
    </DialogProvider>
  )
}
