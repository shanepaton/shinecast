// The text to show for whatever was thrown, which isn't always an Error.
export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
