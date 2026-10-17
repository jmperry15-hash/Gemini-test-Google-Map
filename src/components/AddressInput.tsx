import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";

export interface AddressValue {
  text: string;
  place?: google.maps.places.Place;
}
interface Props {
  id: string;
  label: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AddressInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: Props) {
  const places = useMapsLibrary("places");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.PlacePrediction[]
  >([]);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [notice, setNotice] = useState("");
  const revision = useRef(0);
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    const current = ++revision.current;
    setSuggestions([]);
    setActive(-1);
    if (
      !places ||
      !focused ||
      disabled ||
      value.place ||
      value.text.trim().length < 3
    )
      return;
    const timer = setTimeout(async () => {
      try {
        session.current ??= new places.AutocompleteSessionToken();
        const response =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: value.text,
            sessionToken: session.current,
          });
        if (current !== revision.current) return;
        setSuggestions(
          response.suggestions.flatMap((s) =>
            s.placePrediction ? [s.placePrediction] : [],
          ),
        );
        setNotice("");
      } catch {
        if (current === revision.current)
          setNotice(
            "Suggestions unavailable. You can still enter a full address.",
          );
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      revision.current++;
    };
  }, [places, value.text, value.place, focused, disabled]);

  async function select(prediction: google.maps.places.PlacePrediction) {
    const current = ++revision.current;
    setSuggestions([]);
    setActive(-1);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "location"] });
      if (current !== revision.current) return;
      callback.current({
        text: place.formattedAddress || prediction.text.toString(),
        place,
      });
      setNotice("");
    } catch {
      if (current === revision.current)
        callback.current({ text: prediction.text.toString() });
    } finally {
      session.current = null;
    }
  }

  return (
    <div
      className="address-field"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <MapPin size={18} aria-hidden="true" />
        <input
          id={id}
          value={value.text}
          disabled={disabled}
          placeholder={placeholder || "Search a place or enter an address"}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            active >= 0 ? `${id}-option-${active}` : undefined
          }
          aria-describedby={notice ? `${id}-notice` : undefined}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            revision.current++;
            callback.current({ text: e.target.value });
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              revision.current++;
              setSuggestions([]);
              setActive(-1);
            }
            if (
              suggestions.length &&
              (e.key === "ArrowDown" || e.key === "ArrowUp")
            ) {
              e.preventDefault();
              setActive(
                (n) =>
                  (n + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) %
                  suggestions.length,
              );
            }
            if (e.key === "Enter" && active >= 0 && suggestions[active]) {
              e.preventDefault();
              void select(suggestions[active]);
            }
          }}
        />
      </div>
      <ul
        id={`${id}-options`}
        role="listbox"
        className={suggestions.length ? "suggestions" : "suggestions hidden"}
      >
        {suggestions.map((s, i) => (
          <li
            key={s.placeId}
            id={`${id}-option-${i}`}
            role="option"
            aria-selected={active === i}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void select(s)}
            className={active === i ? "active" : ""}
          >
            {s.text.toString()}
          </li>
        ))}
      </ul>
      {notice && (
        <p id={`${id}-notice`} className="field-note">
          {notice}
        </p>
      )}
    </div>
  );
}
