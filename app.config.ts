export default defineAppConfig({
  ui: {
    colors: {
      primary: 'theme',
      secondary: 'green',

      neutral: 'neutral',
    },
    button: {
      base: 'disabled:opacity-30',
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: 'text-theme-50',
        },
        {
          variant: 'outline',
          class: 'ring-2 bg-transparent',
        },
        {
          color: 'primary',
          variant: 'outline',
          class: 'ring-theme-500',
        },
      ],
    },
    icons: {
      close: 'i-material-symbols-close-rounded',
    },
    select: {
      compoundVariants: [
        {
          color: 'primary',
          variant: 'outline',
          class: 'ring-2 ring-theme-500',
        },
      ],
    },
  },
})
