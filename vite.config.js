import { defineConfig } from 'vite'

export default defineConfig({
    test: {
        singleThread: true,
        clearMocks: true,
        globals: true,
        setupFiles: ['__tests__/setup'], //this line,
    },
})
