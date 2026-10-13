import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMapsLibrary, useMap, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { AddressInput } from './AddressInput';
import { Plus, Trash2, Calculator, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { averageMiles, formatRouteResult, type CalculationResult } from '../routeMath';

export const DistanceCalculator: React.FC = () => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const geocodingLib = useMapsLibrary('geocoding');
  
  const [referenceAddress, setReferenceAddress] = useState('');
  const [destinations, setDestinations] = useState<string[]>(['']);
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [refLocation, setRefLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const placedOriginRef = useRef<string | null>(null);

  const handleOriginChange = (value: string, location?: google.maps.LatLngLiteral | null) => {
    setReferenceAddress(value);
    if (location) {
      placedOriginRef.current = value;
      setRefLocation(location);
      setErrorLog(null);
      return;
    }
    if (placedOriginRef.current && placedOriginRef.current !== value) {
      placedOriginRef.current = null;
    }
  };

  // Geocode typed origins. A place selected from suggestions already has coordinates.
  useEffect(() => {
    if (!referenceAddress) {
      placedOriginRef.current = null;
      setRefLocation(null);
      return;
    }
    if (!geocodingLib || placedOriginRef.current === referenceAddress) return;

    const timer = setTimeout(() => {
      const geocoder = new geocodingLib.Geocoder();
      geocoder.geocode({ address: referenceAddress }, (geocodeResults, status) => {
        if (placedOriginRef.current === referenceAddress) return;
        if (status === 'OK' && geocodeResults?.[0]) {
          const loc = geocodeResults[0].geometry.location;
          setRefLocation({ lat: loc.lat(), lng: loc.lng() });
          setErrorLog(null);
        } else if (status !== 'OK' && referenceAddress.length > 5) {
          setErrorLog(`Geocoding failed for reference point: ${status}`);
        }
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [geocodingLib, referenceAddress]);

  // Handle map centering
  useEffect(() => {
    if (map && refLocation) {
      map.panTo(refLocation);
      map.setZoom(14);
    }
  }, [map, refLocation]);

  const addDestination = () => {
    if (destinations.length < 10) {
      setDestinations([...destinations, '']);
    }
  };

  const removeDestination = (index: number) => {
    const newDests = destinations.filter((_, i) => i !== index);
    setDestinations(newDests.length ? newDests : ['']);
  };

  const updateDestination = (index: number, value: string) => {
    setDestinations((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const calculateDistances = useCallback(async () => {
    if (!routesLib || !referenceAddress || destinations.filter(d => d.trim()).length === 0) {
      setErrorLog("Missing reference address or destinations.");
      return;
    }

    setIsCalculating(true);
    setResults([]);
    setErrorLog(null);

    const validDestinations = destinations.filter(d => d.trim() !== '');

    try {
      // Using computeRoutes as recommended by the skill, but with improved error logging
      const promises = validDestinations.map(async (dest) => {
        try {
          const response = await routesLib.Route.computeRoutes({
            origin: referenceAddress,
            destination: dest,
            travelMode: 'DRIVING',
            fields: ['distanceMeters', 'durationMillis'],
          });

          const route = response.routes?.[0];
          return formatRouteResult(dest, route && {
            distanceMeters: route.distanceMeters,
            durationMillis: route.durationMillis,
          });
        } catch (error: any) {
          console.error(`Error calculating route to ${dest}:`, error);
          const errorMsg = error?.message || String(error);
          if (errorMsg.includes('API key')) setErrorLog("Error: Invalid or restricted API key.");
          else if (errorMsg.includes('PermissionDenied')) setErrorLog("Error: Routes API not enabled in Cloud Console.");
          else setErrorLog(`API Error: ${errorMsg}`);
          
          return {
            address: dest,
            distance: 'Error',
            duration: 'Error',
            status: 'error' as const,
          };
        }
      });

      const resolvedResults = await Promise.all(promises);
      setResults(resolvedResults);
    } catch (err: any) {
      setErrorLog(`General calculation error: ${err.message || String(err)}`);
    } finally {
      setIsCalculating(false);
    }
  }, [routesLib, referenceAddress, destinations]);

  const avgDistance = averageMiles(results);

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-900 bg-slate-50 font-sans">
      {/* Header Navigation */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase text-slate-800">
            Dist-Matrix <span className="font-normal text-slate-400">v2.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-[10px] font-mono bg-slate-100 px-3 py-1 border border-slate-200 rounded text-slate-600 uppercase tracking-tighter">
            System Status: <span className="text-emerald-600 font-bold underline decoration-indigo-200">Operational</span>
          </div>
          <button
            onClick={calculateDistances}
            disabled={isCalculating || !referenceAddress || destinations.filter(d => d.trim()).length === 0}
            className="bg-slate-900 text-white px-5 py-2 text-sm font-bold hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 transition-all uppercase tracking-widest active:bg-slate-700"
          >
            {isCalculating ? 'Processing...' : 'Run Matrix'}
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Origin Configuration */}
        <aside className="w-96 bg-white border-r border-slate-200 p-8 flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar">
          <div className="mb-8 p-1 bg-slate-50 border border-slate-100">
            <AddressInput
              id="reference"
              label="Primary Origin Node"
              value={referenceAddress}
              onChange={handleOriginChange}
              placeholder="Enter base address..."
            />
          </div>

          <div className="flex-1 space-y-6">
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Destination Grid</h3>
                <span className="text-[10px] font-mono text-indigo-400 font-bold px-2 py-0.5 border border-indigo-100 bg-indigo-50/30 rounded">
                  {destinations.length}/10 Slots
                </span>
              </div>
              
              <div className="space-y-4 mb-6">
                <AnimatePresence initial={false}>
                  {destinations.map((dest, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="group relative"
                    >
                      <div className="flex items-start gap-2 pr-8">
                        <AddressInput
                          id={`dest-${index}`}
                          label={`Node ID #0${index + 1}`}
                          value={dest}
                          onChange={(val) => updateDestination(index, val)}
                          placeholder="Enter destination..."
                        />
                      </div>
                      {destinations.length > 1 && (
                        <button
                          onClick={() => removeDestination(index)}
                          className="absolute bottom-3 right-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <button
                onClick={addDestination}
                disabled={destinations.length >= 10}
                className="w-full h-12 border-2 border-dashed border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Plus className="w-3 h-3" />
                Add Node Position
              </button>
            </div>
            
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="text-slate-500 uppercase tracking-tighter">Travel Mode</span>
                  <span className="font-bold uppercase text-slate-800">Driving (Normal)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="text-slate-500 uppercase tracking-tighter">Matrix Radius</span>
                  <span className="font-bold uppercase text-slate-800">Unlimited</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-indigo-50 border border-indigo-100 p-4 rounded-sm">
            <div className="text-[10px] font-bold text-indigo-600 uppercase mb-1 flex items-center gap-1.5">
              <div className="w-1 h-1 bg-indigo-600 rounded-full"></div> System Instruction
            </div>
            <p className="text-[11px] text-indigo-800 leading-relaxed font-medium">
              Define the source origin node then map comparison destinations in the grid. Run the matrix to compute real-world latency and distance.
            </p>
          </div>

          {errorLog && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 bg-red-50 border border-red-100 p-4 rounded-sm text-red-800"
            >
              <div className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1.5">
                 <div className="w-1 h-1 bg-red-600 rounded-full"></div> Error Console
              </div>
              <p className="text-[11px] font-mono leading-tight">{errorLog}</p>
              <p className="text-[8px] mt-2 opacity-60 italic">Check Google Cloud Console to ensure Routes API, Places API (New), and Geocoding API are enabled.</p>
            </motion.div>
          )}
        </aside>

        {/* Main Matrix Grid */}
        <section className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          {/* Map Viewport */}
          <div className="h-64 bg-slate-200 m-8 mb-0 border border-slate-300 relative overflow-hidden flex-shrink-0 group">
            <Map
              defaultCenter={{ lat: 37.42, lng: -122.08 }}
              defaultZoom={12}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="w-full h-full"
              style={{ height: '100%' }}
              disableDefaultUI={true}
            >
              {refLocation && (
                <AdvancedMarker position={refLocation}>
                  <Pin background="#4f46e5" glyphColor="#fff" borderColor="#3730a3" />
                </AdvancedMarker>
              )}
            </Map>
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-slate-300 shadow-sm z-10">
              Live Network Preview Module
            </div>
            {!refLocation && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-200/90 backdrop-blur-[1px] text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
                Awaiting Reference Coordinates
              </div>
            )}
            {/* Design accents */}
            <div className="absolute bottom-0 right-0 h-8 w-24 bg-slate-900 z-10 flex items-center justify-center">
              <span className="text-[10px] text-white font-mono opacity-50">GRID: SECURED</span>
            </div>
          </div>

          {/* Results Grid */}
          <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar content-start">
            {results.length > 0 ? (
              results.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white border p-5 flex items-center gap-4 group transition-all hover:border-indigo-400 ${
                    result.status === 'success' ? 'border-slate-200' : 'border-red-200 bg-red-50/10'
                  }`}
                >
                  <span className="text-xs font-mono text-slate-300 group-hover:text-indigo-300 transition-colors">
                    0{index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">
                      Destination Node
                    </div>
                    <div className="text-[13px] font-medium text-slate-900 truncate" title={result.address}>
                      {result.address}
                    </div>
                  </div>
                  {result.status === 'success' ? (
                    <div className="text-right border-l border-slate-100 pl-4 min-w-[100px]">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">
                        Distance
                      </div>
                      <div className="text-xl font-black text-slate-900 tracking-tighter">
                        {result.distance.split(' ')[0]} <span className="text-[10px] font-bold text-slate-400 uppercase">{result.distance.includes('miles') ? 'mi' : 'km'}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">
                        ETA: {result.duration}
                      </div>
                    </div>
                  ) : (
                    <div className="text-right pl-4">
                      <div className="text-[10px] font-bold text-red-500 uppercase">Error</div>
                      <div className="text-xs font-bold text-red-400">Locked</div>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="col-span-full h-full border-2 border-dashed border-slate-200 rounded-sm flex flex-col items-center justify-center p-12 text-center opacity-50">
                <Calculator className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Matrix Interface Null</h3>
                <p className="text-[11px] text-slate-400 max-w-xs uppercase">
                  No active nodes detected. Populate the sidebar configuration and execute command.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Metrics */}
      <footer className="h-12 bg-slate-900 text-white flex items-center px-8 justify-between flex-shrink-0">
        <div className="flex gap-12">
          <div className="flex items-center gap-3 border-r border-slate-800 pr-12">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Nodes</span>
            <span className="text-sm font-mono text-white leading-none">{String(destinations.length).padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-3 border-r border-slate-800 pr-12">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Radius</span>
            <span className="text-sm font-mono text-indigo-400 leading-none">{avgDistance} mi</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Computation Cost</span>
            <span className="text-sm font-mono text-emerald-400 leading-none">
              ${(results.length * 0.005).toFixed(3)}
            </span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
          Navigator Environment • G-Matrix Engine Alpha • Precision Layout Config
        </div>
      </footer>
    </div>
  );
};
