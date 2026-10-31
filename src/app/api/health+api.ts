// Expo Router API route — runs on the server (EAS Hosting / Node), never in the app bundle.
// https://docs.expo.dev/router/web/api-routes/
export function GET() {
  return Response.json({ status: 'ok', time: new Date().toISOString() });
}
