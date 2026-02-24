"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider(props: ThemeProviderProps) {
  const {
    attribute = "class",
    defaultTheme = "dark",
    enableSystem = true,
    disableTransitionOnChange = true,
    children,
    ...rest
  } = props

  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...rest}
    >
      {children}
    </NextThemesProvider>
  )
}
