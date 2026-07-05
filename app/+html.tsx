import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Root HTML document for the web build. Expo Router wraps every web page in this.
// The key reason it exists: stop iOS Safari from auto-zooming when you tap a text
// field. Safari force-zooms whenever a focused input's font-size is under 16px —
// so we pin every form control to 16px, which is the only reliable cross-version
// fix. Pinch-to-zoom stays available (we don't disable user scaling).
const responsiveInputs = `
input, textarea, select {
  font-size: 16px !important;
}
/* Keep tap targets from flashing the grey iOS highlight box. */
* {
  -webkit-tap-highlight-color: transparent;
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover lets content use the full screen under the notch;
            no maximum-scale so accessibility pinch-zoom keeps working. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveInputs }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
