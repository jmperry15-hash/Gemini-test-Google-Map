import { APIProvider } from "@vis.gl/react-google-maps";
import { DistanceCalculator } from "./components/DistanceCalculator";

const API_KEY = (process.env.GOOGLE_MAPS_PLATFORM_KEY || "").trim();
const hasKey =
  Boolean(API_KEY) && !/^(YOUR_API_KEY|MY_.*|YOUR_.*)$/i.test(API_KEY);
export default function App() {
  if (!hasKey) return <DistanceCalculator hasKey={false} />;
  return (
    <APIProvider
      apiKey={API_KEY}
      version="weekly"
      libraries={["places", "routes"]}
    >
      <DistanceCalculator hasKey={hasKey} />
    </APIProvider>
  );
}
