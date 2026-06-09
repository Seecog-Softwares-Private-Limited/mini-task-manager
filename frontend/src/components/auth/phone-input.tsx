"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { authInputClass } from "@/components/auth/premium-auth-shell";
import {
  COUNTRIES,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
  type Country,
} from "@/lib/country-codes";
import { CountryFlag } from "@/components/auth/country-flag";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
  countryIso: string;
  phoneNumber: string;
  onCountryChange: (iso: string) => void;
  onPhoneNumberChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
};

function CountryOption({ country, onSelect }: { country: Country; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="option"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-violet-50 focus-visible:bg-violet-50 focus-visible:outline-none"
    >
      <CountryFlag iso={country.iso} size="sm" />
      <span className="min-w-0 flex-1 truncate">{country.name}</span>
      <span className="shrink-0 text-slate-400">+{country.dialCode}</span>
    </button>
  );
}

export function PhoneInput({
  countryIso,
  phoneNumber,
  onCountryChange,
  onPhoneNumberChange,
  id = "otp-phone",
  disabled = false,
  className,
}: PhoneInputProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCountry = getCountryByIso(countryIso) ?? getCountryByIso(DEFAULT_COUNTRY_ISO)!;

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query.replace(/\D/g, "")) ||
        country.iso.toLowerCase().includes(query)
    );
  }, [search]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative flex gap-2", className)}>
      <div className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            authInputClass,
            "flex h-12 min-w-[7.5rem] items-center gap-2 px-3 pr-8 text-left disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          <CountryFlag iso={selectedCountry.iso} />
          <span className="text-[15px] font-medium text-slate-700">+{selectedCountry.dialCode}</span>
          <ChevronDown
            className={cn(
              "pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div
            id={listId}
            role="listbox"
            className="absolute left-0 top-[calc(100%+0.375rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)]"
          >
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400/80 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/15"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <CountryOption
                    key={country.iso}
                    country={country}
                    onSelect={() => {
                      onCountryChange(country.iso);
                      setOpen(false);
                      setSearch("");
                    }}
                  />
                ))
              ) : (
                <p className="px-3 py-6 text-center text-sm text-slate-400">No countries found</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="Phone number"
        value={phoneNumber}
        disabled={disabled}
        onChange={(e) => onPhoneNumberChange(e.target.value.replace(/[^\d\s-]/g, ""))}
        className={cn(authInputClass, "min-w-0 flex-1")}
      />
    </div>
  );
}
