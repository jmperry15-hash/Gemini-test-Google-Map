import { APIProvider } from '@vis.gl/react-google-maps';
import { DistanceCalculator } from './components/DistanceCalculator';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY !== '';

export default function App() {
  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 w-full max-w-xl text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Google Maps API Key Required</h2>
          <div className="text-left space-y-4 text-slate-600 leading-relaxed">
            <p className="font-medium text-slate-900 border-b border-slate-100 pb-2">Follow these steps to enable the app:</p>
            <div className="space-y-3 pt-2">
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-slate-100 text-slate-800 text-xs font-bold rounded-full flex items-center justify-center mt-1">1</span>
                <div className="space-y-1">
                  <p>Get an API key from the <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="text-indigo-600 hover:underline font-medium">Google Maps Platform console</a>.</p>
                  <p className="text-xs font-bold text-slate-900 underline">IMPORTANT: You must enable these APIs:</p>
                  <ul className="text-xs list-disc list-inside space-y-1 text-slate-500">
                    <li>Routes API (New)</li>
                    <li>Places API (New)</li>
                    <li>Maps JavaScript API</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-6 h-6 bg-slate-100 text-slate-800 text-xs font-bold rounded-full flex items-center justify-center mt-1">2</span>
                <div className="space-y-2">
                  <p>Add your key as a secret in <strong>Settings</strong>:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                    <li>Click the <strong>Settings</strong> (⚙️) gear icon in the top-right.</li>
                    <li>Select <strong>Secrets</strong>.</li>
                    <li>Type <code className="bg-slate-100 px-1 rounded text-indigo-700 font-mono">GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name.</li>
                    <li>Paste your key as the value and press <strong>Enter</strong>.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-50">
            <p className="text-xs text-slate-400 italic">The app will rebuild automatically after you add the secret.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="min-h-screen bg-slate-50 selection:bg-indigo-600 selection:text-white">
        <DistanceCalculator />
      </div>
    </APIProvider>
  );
}
