import { Redirect } from 'expo-router';

// Placeholder screen — the tab button intercepts presses and routes to /create.
// If we end up here (e.g., deep link), bounce to the studio.
export default function CreateFake() {
  return <Redirect href={'/create' as any} />;
}
