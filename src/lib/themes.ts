export const themes = {
  zinc: {
    name: 'Zinc',
    activeColor: {
      light: 'oklch(0.205 0 0)',
      dark: 'oklch(0.985 0 0)',
    },
    cssVars: {
      light: {
        '--primary': 'oklch(0.205 0 0)',
        '--primary-foreground': 'oklch(0.985 0 0)',
        '--ring': 'oklch(0.708 0 0)',
      },
      dark: {
        '--primary': 'oklch(0.985 0 0)',
        '--primary-foreground': 'oklch(0.205 0 0)',
        '--ring': 'oklch(0.556 0 0)',
      },
    },
  },
  red: {
    name: 'Red',
    activeColor: {
      light: 'oklch(0.577 0.245 27.325)',
      dark: 'oklch(0.577 0.245 27.325)',
    },
    cssVars: {
      light: {
        '--primary': 'oklch(0.577 0.245 27.325)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.577 0.245 27.325)',
      },
      dark: {
        '--primary': 'oklch(0.577 0.245 27.325)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.577 0.245 27.325)',
      },
    },
  },
  rose: {
    name: 'Rose',
    activeColor: {
      light: 'oklch(0.558 0.288 3.551)',
      dark: 'oklch(0.558 0.288 3.551)',
    },
    cssVars: {
      light: {
        '--primary': 'oklch(0.558 0.288 3.551)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.558 0.288 3.551)',
      },
      dark: {
        '--primary': 'oklch(0.558 0.288 3.551)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.558 0.288 3.551)',
      },
    },
  },
  orange: {
    name: 'Orange',
    activeColor: {
      light: 'oklch(0.646 0.222 41.116)',
      dark: 'oklch(0.646 0.222 41.116)',
    },
    cssVars: {
      light: {
        '--primary': 'oklch(0.646 0.222 41.116)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.646 0.222 41.116)',
      },
      dark: {
        '--primary': 'oklch(0.646 0.222 41.116)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.646 0.222 41.116)',
      },
    },
  },
  green: {
    name: 'Green',
    activeColor: {
      light: 'oklch(0.572 0.177 142.923)',
      dark: 'oklch(0.572 0.177 142.923)',
    },
    cssVars: {
      light: {
        '--primary': 'oklch(0.572 0.177 142.923)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.572 0.177 142.923)',
      },
      dark: {
        '--primary': 'oklch(0.572 0.177 142.923)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.572 0.177 142.923)',
      },
    },
  },
  blue: {
    name: 'Blue',
    activeColor: {
      light: 'oklch(0.511 0.207 262.298)',
      dark: 'oklch(0.511 0.207 262.298)',
    },
    cssVars: {
      light: {
        '--primary': 'oklch(0.511 0.207 262.298)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.511 0.207 262.298)',
      },
      dark: {
        '--primary': 'oklch(0.511 0.207 262.298)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.511 0.207 262.298)',
      },
    },
  },
  yellow: {
    name: 'Yellow',
    activeColor: {
      light: 'oklch(0.795 0.184 86.047)',
      dark: 'oklch(0.795 0.184 86.047)',
    },
    cssVars: {
      light: {
        '--primary': 'oklch(0.795 0.184 86.047)',
        '--primary-foreground': 'oklch(0.205 0 0)',
        '--ring': 'oklch(0.795 0.184 86.047)',
      },
      dark: {
        '--primary': 'oklch(0.795 0.184 86.047)',
        '--primary-foreground': 'oklch(0.205 0 0)',
        '--ring': 'oklch(0.795 0.184 86.047)',
      },
    },
  },
  violet: {
    name: 'Violet',
    activeColor: {
      light: 'oklch(0.541 0.281 293.009)',
      dark: 'oklch(0.541 0.281 293.009)',
    },
    cssVars: {
      light: {
        '--primary': 'oklch(0.541 0.281 293.009)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.541 0.281 293.009)',
      },
      dark: {
        '--primary': 'oklch(0.541 0.281 293.009)',
        '--primary-foreground': 'oklch(1 0 0)',
        '--ring': 'oklch(0.541 0.281 293.009)',
      },
    },
  },
} as const

export type ThemeColor = keyof typeof themes
