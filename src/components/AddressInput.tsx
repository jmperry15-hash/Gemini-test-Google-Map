import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useMapsLibrary} from '@vis.gl/react-google-maps';

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string, location?: google.maps.LatLngLiteral | null) => void;
  placeholder?: string;
  id: string;
}

export const AddressInput: React.FC<AddressInputProps> = ({label, value, onChange, placeholder, id}) => {
  const placesLib = useMapsLibrary('places');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const inputRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestSerial = useRef(0);
  const acceptedValueRef = useRef<string | null>(null);
  const warnedRef = useRef(false);

  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (acceptedValueRef.current === value) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const query = value.trim();
    if (!placesLib || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const serial = ++requestSerial.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (!sessionTokenRef.current) {
            sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
          }
          const {suggestions: results} = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: sessionTokenRef.current,
          });
          if (serial !== requestSerial.current) return;

          const predictions = results
            .map((item) => item.placePrediction)
            .filter((item): item is google.maps.places.PlacePrediction => item != null);
          setSuggestions(predictions);
          setActiveIndex(0);
          setOpen(predictions.length > 0);
        } catch (error) {
          if (serial !== requestSerial.current) return;
          if (!warnedRef.current) {
            console.error('Place autocomplete failed', error);
            warnedRef.current = true;
          }
          setSuggestions([]);
          setOpen(false);
        }
      })();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [placesLib, value]);

  const selectPrediction = async (prediction: google.maps.places.PlacePrediction) => {
    setOpen(false);
    setSuggestions([]);
    const fallback = prediction.text?.text ?? '';
    try {
      const place = prediction.toPlace();
      await place.fetchFields({fields: ['formattedAddress', 'location', 'displayName']});
      const address = place.formattedAddress || place.displayName || fallback;
      const location = place.location
        ? {lat: place.location.lat(), lng: place.location.lng()}
        : null;
      acceptedValueRef.current = address;
      onChangeRef.current(address, location);
    } catch (error) {
      console.error('Place details failed', error);
      acceptedValueRef.current = fallback;
      onChangeRef.current(fallback, null);
    } finally {
      sessionTokenRef.current = placesLib ? new placesLib.AutocompleteSessionToken() : null;
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const prediction = suggestions[activeIndex];
      if (prediction) void selectPrediction(prediction);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const listId = `${id}-suggestions`;

  return (
    <div className="flex flex-col gap-1 w-full">
      <label htmlFor={id} className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full border-2 border-slate-900 bg-slate-50 p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
        />
        <div className="absolute top-0 right-0 h-full flex items-center pr-3 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
        </div>
      </div>
      {open && inputRef.current && (
        <SuggestionMenu
          id={listId}
          anchor={inputRef.current}
          suggestions={suggestions}
          activeIndex={activeIndex}
          onHover={setActiveIndex}
          onSelect={(prediction) => void selectPrediction(prediction)}
        />
      )}
    </div>
  );
};

function SuggestionMenu({
  id,
  anchor,
  suggestions,
  activeIndex,
  onHover,
  onSelect,
}: {
  id: string;
  anchor: HTMLInputElement;
  suggestions: google.maps.places.PlacePrediction[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (prediction: google.maps.places.PlacePrediction) => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const update = () => setRect(anchor.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchor, suggestions]);

  if (!rect) return null;

  return createPortal(
    <ul
      id={id}
      role="listbox"
      style={{position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width}}
      className="z-[10000] max-h-60 overflow-y-auto border-2 border-slate-900 bg-white shadow-[4px_4px_0_0_rgba(15,23,42,0.1)]"
    >
      {suggestions.map((prediction, index) => (
        <li key={prediction.placeId || `${prediction.text.text}-${index}`} role="option" aria-selected={index === activeIndex}>
          <button
            type="button"
            className={`block w-full px-3 py-2 text-left text-[13px] text-slate-800 border-t border-slate-100 first:border-t-0 ${
              index === activeIndex ? 'bg-slate-50' : 'bg-white'
            }`}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(prediction);
            }}
          >
            {prediction.text.text}
          </button>
        </li>
      ))}
    </ul>,
    document.body,
  );
}
