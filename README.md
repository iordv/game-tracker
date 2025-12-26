# GameTracker PWA

A modern, "iOS 26 Liquid Glass" styled Progressive Web App (PWA) for tracking game updates, patches, and DLC.

## Features

-   **Beautiful Liquid Glass UI**: Inspired by futuristic iOS concepts with heavy blur and transparency.
-   **Real-time Updates**: Fetches the latest patch notes and news directly from Steam.
-   **Game Search**: Powered by RAWG API to find any game.
-   **Robust Data Fetching**: Uses a multi-proxy rotation strategy to bypass CORS restrictions reliably.
-   **Local Storage**: Saves your favorite games effectively in the browser.
-   **PWA Support**: Installable on mobile and desktop.

## Technologies

-   Vanilla JavaScript (No framework overhead)
-   CSS Variables & Modern Layouts (Grid/Flexbox)
-   RAWG API (Game Data)
-   Steam Web API (News & Patches)

## How to Run

1.  Clone the repository.
2.  Serve the directory using a static web server:
    ```bash
    python3 -m http.server 8080
    ```
    or
    ```bash
    npx serve
    ```
3.  Open `http://localhost:8080` in your browser.

## Development

The project structure is simple:
-   `index.html`: Entry point.
-   `styles/`: CSS files (Liquid Glass styling).
-   `js/`: Application logic (API, UI, Storage).
-   `assets/`: Icons and images.

## License

MIT
