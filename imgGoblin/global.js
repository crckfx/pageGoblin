export const sizes = {
    xsmall: 480,
    small: 768,
    medium: 1024,
    large: 1440,
    xlarge: 2560,
};

export const imagePresets = {
    half: {
        sizes: '(max-width: 768px) 85vw, 720px',
        maxWidth: 1440
    },
    thumb: {
        sizes: '(max-width: 480px) 85vw, 450px',
        maxWidth: 1024
    },
    contain: {
        sizes: '(max-width: 1440px) 85vw, 1440px',
        maxWidth: 1440
    },
    cover: {
        sizes: '100vw',
        maxWidth: 2560
    },
};