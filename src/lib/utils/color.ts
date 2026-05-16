/**
 * Utility for handling theme colors and CSS variable injection
 */

/**
 * Converts a hex color to an RGB object
 */
export function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    try {
        const cleanHex = hex.replace('#', '');
        if (cleanHex.length !== 6) return null;
        
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        
        return { r, g, b };
    } catch (e) {
        return null;
    }
}

/**
 * Injects a primary color into the document root as a CSS variable
 * Format: --color-primary: 59 130 246
 */
export function applyThemeColor(hex: string) {
    const rgb = hexToRgb(hex);
    if (rgb) {
        document.documentElement.style.setProperty('--color-primary', `${rgb.r} ${rgb.g} ${rgb.b}`);
        // Optionally update other derived variables if needed
        document.documentElement.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
}
