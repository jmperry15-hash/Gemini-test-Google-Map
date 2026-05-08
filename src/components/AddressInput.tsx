import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id: string;
}

export const AddressInput: React.FC<AddressInputProps> = ({ label, value, onChange, placeholder, id }) => {
  const placesLib = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const options: google.maps.places.AutocompleteOptions = {
      fields: ['formatted_address', 'geometry', 'name'],
    };

    const newAutocomplete = new placesLib.Autocomplete(inputRef.current, options);
    setAutocomplete(newAutocomplete);

    newAutocomplete.addListener('place_changed', () => {
      const place = newAutocomplete.getPlace();
      if (place.formatted_address) {
        onChange(place.formatted_address);
      } else if (place.name) {
        onChange(place.name);
      }
    });

    return () => {
      if (newAutocomplete) {
        google.maps.event.clearInstanceListeners(newAutocomplete);
      }
    };
  }, [placesLib]);

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
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border-2 border-slate-900 bg-slate-50 p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
        />
        <div className="absolute top-0 right-0 h-full flex items-center pr-3 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
        </div>
      </div>
    </div>
  );
};
